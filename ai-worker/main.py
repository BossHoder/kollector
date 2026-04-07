import io
import json
import logging
import os
import posixpath
import re
import sys
import time
import uuid
from pathlib import Path
from typing import Any

import cloudinary
import cloudinary.uploader
import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, Field, HttpUrl

try:
    from PIL import Image, ImageChops, ImageFilter, ImageOps
except ImportError:  # pragma: no cover - exercised only in misconfigured environments
    Image = None
    ImageChops = None
    ImageFilter = None
    ImageOps = None

try:
    import numpy as np
except ImportError:  # pragma: no cover - exercised only in misconfigured environments
    np = None

load_dotenv()

logger = logging.getLogger("ai_worker")
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)


class RetryableServiceError(Exception):
    pass


class UnprocessableImageError(Exception):
    pass


class BudgetExceededError(RetryableServiceError):
    pass


class MetadataValue(BaseModel):
    value: str
    confidence: float = Field(ge=0.0, le=1.0)


class AnalyzeRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    image_url: HttpUrl
    category: str = Field(min_length=1)


class AnalyzeResponse(BaseModel):
    processed_image_url: str | None = None
    processedImageUrl: str | None = None
    brand: str | MetadataValue | None = None
    model: str | MetadataValue | None = None
    colorway: str | MetadataValue | None = None


class EnhancementResizeOptions(BaseModel):
    enabled: bool = True
    maxWidth: int = Field(default=2048, ge=1)
    maxHeight: int = Field(default=2048, ge=1)
    kernel: str = Field(default="lanczos")


class EnhancementSharpenOptions(BaseModel):
    enabled: bool = True
    method: str = Field(default="unsharp")


class EnhancementCropOptions(BaseModel):
    enabled: bool = True
    mode: str = Field(default="heuristic")


class EnhancementOptions(BaseModel):
    resize: EnhancementResizeOptions = Field(default_factory=EnhancementResizeOptions)
    sharpen: EnhancementSharpenOptions = Field(default_factory=EnhancementSharpenOptions)
    crop: EnhancementCropOptions = Field(default_factory=EnhancementCropOptions)


class EnhanceImageRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    image_url: HttpUrl
    options: EnhancementOptions = Field(default_factory=EnhancementOptions)


class EnhanceImageResponse(BaseModel):
    enhanced_image_url: str | None = None
    enhancedImageUrl: str | None = None
    width: int | None = None
    height: int | None = None


class ErrorPayload(BaseModel):
    message: str
    code: str | None = None
    details: Any | None = None


class ErrorResponse(BaseModel):
    error: ErrorPayload


class HealthResponse(BaseModel):
    status: str = "ok"
    models: dict[str, Any] | None = None


TOTAL_BUDGET_MS = int(os.getenv("ANALYZE_TOTAL_BUDGET_MS", "90000"))
DOWNLOAD_BUDGET_MS = int(os.getenv("ANALYZE_DOWNLOAD_BUDGET_MS", "20000"))
INFERENCE_BUDGET_MS = int(os.getenv("ANALYZE_INFERENCE_BUDGET_MS", "50000"))
UPLOAD_BUDGET_MS = int(os.getenv("ANALYZE_UPLOAD_BUDGET_MS", "15000"))

MAX_DOWNLOAD_BYTES = int(os.getenv("MAX_DOWNLOAD_BYTES", "15728640"))
ALLOWED_IMAGE_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}
MIN_MASK_ALPHA = 8

MODEL_REMOVE_BG = os.getenv("MODEL_REMOVE_BG", "briaai/RMBG-1.4")
MODEL_REMOVE_BG_REVISION = os.getenv("MODEL_REMOVE_BG_REVISION", "")
MODEL_VISION = os.getenv("MODEL_VISION", "vikhyatk/moondream2")
MODEL_VISION_REVISION = os.getenv("MODEL_VISION_REVISION", "")
DEFAULT_STORAGE_DRIVER = (
    "cloudinary"
    if all(
        [
            os.getenv("CLOUDINARY_CLOUD_NAME"),
            os.getenv("CLOUDINARY_API_KEY"),
            os.getenv("CLOUDINARY_API_SECRET"),
        ]
    )
    else "local"
)
UPLOADS_ROUTE_PREFIX = "/uploads"

UNKNOWN_MARKERS = {
    "",
    "unknown",
    "n/a",
    "na",
    "none",
    "null",
    "unsure",
    "not sure",
    "cannot determine",
    "can't determine",
    "cant determine",
    "unclear",
}

_remove_bg_model: dict[str, Any] | None = None
_vision_model: dict[str, Any] | None = None


def _configure_cloudinary() -> None:
    if _cloudinary_configured():
        cloudinary.config(
            cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
            api_key=os.getenv("CLOUDINARY_API_KEY"),
            api_secret=os.getenv("CLOUDINARY_API_SECRET"),
            secure=True,
        )


def _cloudinary_configured() -> bool:
    return all(
        [
            os.getenv("CLOUDINARY_CLOUD_NAME"),
            os.getenv("CLOUDINARY_API_KEY"),
            os.getenv("CLOUDINARY_API_SECRET"),
        ]
    )


def _python_supported() -> bool:
    return (3, 11) <= sys.version_info < (3, 13)


def _ensure_supported_python() -> None:
    if not _python_supported():
        raise RetryableServiceError(
            "Python 3.11 or 3.12 is required for the ai-worker ML dependencies"
        )


def _require_pillow() -> None:
    if Image is None:
        raise RetryableServiceError(
            "Pillow is not installed. Reinstall ai-worker requirements with Python 3.11 or 3.12."
        )


def _require_numpy() -> None:
    if np is None:
        raise RetryableServiceError(
            "NumPy is not installed. Reinstall ai-worker requirements with Python 3.11 or 3.12."
        )


def _stage_budget(remaining_ms: int, stage_limit_ms: int, stage_name: str) -> int:
    budget_ms = min(remaining_ms, stage_limit_ms)
    if budget_ms <= 0:
        raise BudgetExceededError(f"{stage_name} budget exceeded")
    return budget_ms


def _enforce_stage_budget(start_monotonic: float, budget_ms: int, stage_name: str) -> None:
    elapsed_ms = int((time.monotonic() - start_monotonic) * 1000)
    if elapsed_ms > budget_ms:
        raise BudgetExceededError(f"{stage_name} budget exceeded")


def _empty_metadata() -> dict[str, Any]:
    return {"brand": None, "model": None, "colorway": None}


def _download_image_bytes(image_url: str, budget_ms: int) -> bytes:
    timeout_seconds = max(0.001, budget_ms / 1000)
    timeout = httpx.Timeout(timeout_seconds)

    try:
        with httpx.Client(timeout=timeout, follow_redirects=True) as client:
            response = client.get(image_url)
    except httpx.TimeoutException as exc:
        raise RetryableServiceError("Image download timed out") from exc
    except httpx.RequestError as exc:
        raise RetryableServiceError(f"Image download failed: {exc.__class__.__name__}") from exc

    if response.status_code >= 500:
        raise RetryableServiceError(
            f"Image download failed with status {response.status_code}"
        )
    if response.status_code >= 400:
        raise UnprocessableImageError(
            f"Image URL is not accessible: {response.status_code}"
        )

    content_type = (
        (response.headers.get("content-type") or "")
        .split(";", 1)[0]
        .strip()
        .lower()
    )
    if content_type not in ALLOWED_IMAGE_CONTENT_TYPES:
        raise UnprocessableImageError("Unsupported image type")

    content = response.content
    if not content:
        raise UnprocessableImageError("Downloaded image is empty")
    if len(content) > MAX_DOWNLOAD_BYTES:
        raise UnprocessableImageError("Image exceeds maximum allowed size")

    return content


def _load_image(image_bytes: bytes, mode: str = "RGBA") -> Any:
    _require_pillow()

    try:
        with Image.open(io.BytesIO(image_bytes)) as image:
            image.load()
            return image.convert(mode)
    except Exception as exc:
        raise UnprocessableImageError("Downloaded file is not a valid image") from exc


def _image_to_png_bytes(image: Any) -> bytes:
    output = io.BytesIO()
    image.save(output, format="PNG")
    return output.getvalue()


def _slugify(value: str) -> str:
    slug = re.sub(r"[^a-zA-Z0-9_-]+", "-", value.strip().lower()).strip("-")
    return slug or "other"


def _get_storage_root() -> Path:
    return Path(os.getenv("STORAGE_ROOT", "./storage")).resolve()


def _get_storage_public_base_url() -> str:
    configured = os.getenv("STORAGE_PUBLIC_BASE_URL")
    if configured:
        return configured.rstrip("/")

    return "http://localhost:3000"


def _get_storage_internal_base_url() -> str:
    return os.getenv("STORAGE_INTERNAL_BASE_URL", "").rstrip("/")


def _get_storage_driver() -> str:
    return os.getenv("STORAGE_DRIVER", DEFAULT_STORAGE_DRIVER).strip().lower() or "local"


def _storage_configured() -> bool:
    if _get_storage_driver() == "cloudinary":
        return _cloudinary_configured()
    return bool(_get_storage_public_base_url())


def _sanitize_storage_relative_path(relative_path: str) -> str:
    normalized = posixpath.normpath(str(relative_path).replace("\\", "/")).lstrip("/")
    if not normalized or normalized == "." or normalized.startswith("../"):
        raise RetryableServiceError("Invalid storage path")
    return normalized


def _ensure_storage_root() -> None:
    _get_storage_root().mkdir(parents=True, exist_ok=True)


def _build_storage_public_url(relative_path: str) -> str:
    return f"{_get_storage_public_base_url()}{UPLOADS_ROUTE_PREFIX}/{_sanitize_storage_relative_path(relative_path)}"


def _rewrite_download_url(image_url: str) -> str:
    public_base = _get_storage_public_base_url()
    internal_base = _get_storage_internal_base_url()

    if internal_base and public_base and image_url.startswith(public_base):
        return f"{internal_base}{image_url[len(public_base):]}"

    return image_url


def _require_cloudinary_config() -> None:
    if not _cloudinary_configured():
        raise RetryableServiceError("Cloudinary credentials are not configured")


def _upload_processed_image_cloudinary(
    image_bytes: bytes, category: str, budget_ms: int
) -> str:
    start_monotonic = time.monotonic()
    _require_cloudinary_config()

    file_obj = io.BytesIO(image_bytes)
    file_obj.name = "processed.png"

    try:
        result = cloudinary.uploader.upload(
            file_obj,
            resource_type="image",
            folder=f"assets/processed/{_slugify(category)}",
            public_id=f"processed-{uuid.uuid4().hex}",
            format="png",
            overwrite=True,
        )
    except Exception as exc:
        raise RetryableServiceError(f"Cloudinary upload failed: {exc}") from exc

    _enforce_stage_budget(start_monotonic, budget_ms, "Upload")

    secure_url = result.get("secure_url")
    if not secure_url:
        raise RetryableServiceError("Cloudinary upload failed to return URL")
    return secure_url


def _upload_processed_image_local(
    image_bytes: bytes, category: str, budget_ms: int
) -> str:
    start_monotonic = time.monotonic()
    _ensure_storage_root()

    relative_path = _sanitize_storage_relative_path(
        f"assets/processed/{_slugify(category)}/processed-{uuid.uuid4().hex}.png"
    )
    absolute_path = _get_storage_root() / Path(relative_path)
    absolute_path.parent.mkdir(parents=True, exist_ok=True)
    absolute_path.write_bytes(image_bytes)

    _enforce_stage_budget(start_monotonic, budget_ms, "Upload")
    return _build_storage_public_url(relative_path)


def _upload_processed_image(image_bytes: bytes, category: str, budget_ms: int) -> str:
    if _get_storage_driver() == "local":
        return _upload_processed_image_local(image_bytes, category, budget_ms)
    return _upload_processed_image_cloudinary(image_bytes, category, budget_ms)


def _upload_enhanced_image_cloudinary(image_bytes: bytes, budget_ms: int) -> str:
    start_monotonic = time.monotonic()
    _require_cloudinary_config()

    file_obj = io.BytesIO(image_bytes)
    file_obj.name = "enhanced.png"

    try:
        result = cloudinary.uploader.upload(
            file_obj,
            resource_type="image",
            folder="assets/enhanced",
            public_id=f"enhanced-{uuid.uuid4().hex}",
            format="png",
            overwrite=True,
        )
    except Exception as exc:
        raise RetryableServiceError(f"Cloudinary upload failed: {exc}") from exc

    _enforce_stage_budget(start_monotonic, budget_ms, "Upload")

    secure_url = result.get("secure_url")
    if not secure_url:
        raise RetryableServiceError("Cloudinary upload failed to return URL")
    return secure_url


def _upload_enhanced_image_local(image_bytes: bytes, budget_ms: int) -> str:
    start_monotonic = time.monotonic()
    _ensure_storage_root()

    relative_path = _sanitize_storage_relative_path(
        f"assets/enhanced/enhanced-{uuid.uuid4().hex}.png"
    )
    absolute_path = _get_storage_root() / Path(relative_path)
    absolute_path.parent.mkdir(parents=True, exist_ok=True)
    absolute_path.write_bytes(image_bytes)

    _enforce_stage_budget(start_monotonic, budget_ms, "Upload")
    return _build_storage_public_url(relative_path)


def _upload_enhanced_image(image_bytes: bytes, budget_ms: int) -> str:
    if _get_storage_driver() == "local":
        return _upload_enhanced_image_local(image_bytes, budget_ms)
    return _upload_enhanced_image_cloudinary(image_bytes, budget_ms)


def _lanczos_resample() -> Any:
    if hasattr(Image, "Resampling"):
        return Image.Resampling.LANCZOS
    return Image.LANCZOS


def _unsharp_filter() -> Any:
    if ImageFilter is None:
        raise RetryableServiceError("Pillow image filters are not available")
    return ImageFilter.UnsharpMask(radius=2, percent=140, threshold=3)


def _apply_heuristic_crop(image: Any, options: EnhancementCropOptions) -> Any:
    if not options.enabled:
        return image

    _require_numpy()
    array = np.asarray(image.convert("RGB"), dtype="float32")
    grayscale = array.mean(axis=2)

    border_pixels = np.concatenate(
        [
            grayscale[0, :],
            grayscale[-1, :],
            grayscale[:, 0],
            grayscale[:, -1],
        ]
    )
    border_reference = float(np.median(border_pixels))
    delta = np.abs(grayscale - border_reference)
    threshold = max(12.0, float(delta.std()) * 0.5)
    mask = delta > threshold
    coordinates = np.argwhere(mask)

    if coordinates.size == 0:
        return image

    top, left = coordinates.min(axis=0)
    bottom, right = coordinates.max(axis=0) + 1

    cropped_width = int(right - left)
    cropped_height = int(bottom - top)
    min_width = int(image.width * 0.4)
    min_height = int(image.height * 0.4)

    if cropped_width < min_width or cropped_height < min_height:
        return image

    pad_x = max(4, int(image.width * 0.02))
    pad_y = max(4, int(image.height * 0.02))
    crop_box = (
        max(0, int(left - pad_x)),
        max(0, int(top - pad_y)),
        min(image.width, int(right + pad_x)),
        min(image.height, int(bottom + pad_y)),
    )

    if crop_box == (0, 0, image.width, image.height):
        return image

    return image.crop(crop_box)


def _apply_resize(image: Any, options: EnhancementResizeOptions) -> Any:
    if not options.enabled:
        return image

    width, height = image.size
    downscale_ratio = min(options.maxWidth / width, options.maxHeight / height, 1.0)

    upscale_ratio = min(options.maxWidth / width, options.maxHeight / height)
    target_ratio = downscale_ratio

    if max(width, height) < 1600 and upscale_ratio > 1.05:
        target_ratio = min(upscale_ratio, 1.25)

    if abs(target_ratio - 1.0) < 0.05:
        return image

    new_size = (
        max(1, int(round(width * target_ratio))),
        max(1, int(round(height * target_ratio))),
    )
    return image.resize(new_size, resample=_lanczos_resample())


def _apply_sharpen(image: Any, options: EnhancementSharpenOptions) -> Any:
    if not options.enabled:
        return image

    return image.filter(_unsharp_filter())


def _enhance_image(image_bytes: bytes, options: EnhancementOptions, budget_ms: int) -> tuple[bytes, tuple[int, int]]:
    start_monotonic = time.monotonic()
    image = _load_image(image_bytes, mode="RGB")
    image = ImageOps.autocontrast(image, cutoff=1)
    image = _apply_resize(image, options.resize)
    image = _apply_sharpen(image, options.sharpen)
    _enforce_stage_budget(start_monotonic, budget_ms, "Enhancement")
    return _image_to_png_bytes(image), image.size


def _transformers_common_kwargs(revision: str) -> dict[str, Any]:
    kwargs: dict[str, Any] = {"trust_remote_code": True}
    if revision:
        kwargs["revision"] = revision
    return kwargs


def _get_torch_module() -> Any:
    _ensure_supported_python()

    try:
        import torch
    except ImportError as exc:
        raise RetryableServiceError(
            "PyTorch is not installed. Reinstall ai-worker requirements with Python 3.11 or 3.12."
        ) from exc

    return torch


def _get_remove_bg_model() -> dict[str, Any]:
    global _remove_bg_model

    if _remove_bg_model is not None:
        return _remove_bg_model

    torch = _get_torch_module()

    try:
        from transformers import AutoImageProcessor, AutoModelForImageSegmentation

        model_kwargs = _transformers_common_kwargs(MODEL_REMOVE_BG_REVISION)
        processor = AutoImageProcessor.from_pretrained(MODEL_REMOVE_BG, **model_kwargs)
        model = AutoModelForImageSegmentation.from_pretrained(
            MODEL_REMOVE_BG, **model_kwargs
        )
        device = "cuda" if torch.cuda.is_available() else "cpu"
        if device != "cpu":
            model = model.to(device)
        model.eval()
        _remove_bg_model = {
            "type": "auto_model",
            "processor": processor,
            "model": model,
            "torch": torch,
            "device": device,
        }
        return _remove_bg_model
    except Exception as auto_model_exc:
        logger.warning(
            "background_model_auto_load_failed model=%s error=%s",
            MODEL_REMOVE_BG,
            auto_model_exc,
        )

        try:
            from transformers import pipeline

            pipe = pipeline(
                "image-segmentation",
                model=MODEL_REMOVE_BG,
                device=0 if torch.cuda.is_available() else -1,
                trust_remote_code=True,
            )
            _remove_bg_model = {
                "type": "pipeline",
                "pipeline": pipe,
                "torch": torch,
            }
            return _remove_bg_model
        except Exception as pipeline_exc:
            raise RetryableServiceError(
                f"Failed to load background removal model {MODEL_REMOVE_BG}: {pipeline_exc}"
            ) from auto_model_exc


def _iter_tensors(value: Any) -> Any:
    if value is None:
        return

    if isinstance(value, dict):
        for item in value.values():
            yield from _iter_tensors(item)
        return

    if isinstance(value, (list, tuple)):
        for item in value:
            yield from _iter_tensors(item)
        return

    if hasattr(value, "to_tuple"):
        for item in value.to_tuple():
            yield from _iter_tensors(item)
        return

    if hasattr(value, "detach") and hasattr(value, "shape"):
        yield value


def _mask_image_from_array(mask_array: Any, image_size: tuple[int, int]) -> Any:
    _require_pillow()
    _require_numpy()

    array = np.asarray(mask_array)
    if array.ndim == 3:
        array = array[0] if array.shape[0] == 1 else array.max(axis=0)

    if array.ndim != 2:
        return None

    array = array.astype("float32")
    min_value = float(array.min())
    max_value = float(array.max())
    if max_value <= 0:
        return None

    if max_value > 1.0 or min_value < 0.0:
        if max_value == min_value:
            array = np.clip(array / max_value, 0.0, 1.0)
        else:
            array = (array - min_value) / (max_value - min_value)
    else:
        array = np.clip(array, 0.0, 1.0)

    alpha = (array * 255).astype("uint8")
    return Image.fromarray(alpha, mode="L").resize(image_size)


def _extract_mask_from_outputs(outputs: Any, image_size: tuple[int, int], torch: Any) -> Any:
    candidates: list[Any] = []

    for tensor in _iter_tensors(outputs):
        if getattr(tensor, "ndim", 0) < 2:
            continue

        shape = tuple(int(part) for part in tensor.shape)
        spatial = shape[-1] * shape[-2]
        channel_hint = shape[-3] if len(shape) >= 3 else 1
        candidates.append((spatial, -channel_hint, tensor))

    if not candidates:
        return None

    _, _, tensor = max(candidates, key=lambda item: (item[0], item[1]))
    tensor = tensor.detach().float()

    if tensor.ndim == 4:
        tensor = tensor[0]
    if tensor.ndim == 3:
        tensor = tensor[0] if tensor.shape[0] == 1 else tensor.max(dim=0).values
    if tensor.ndim != 2:
        return None

    if float(tensor.max()) > 1.0 or float(tensor.min()) < 0.0:
        tensor = tensor.sigmoid()

    tensor = tensor.clamp(0.0, 1.0)
    tensor = torch.nn.functional.interpolate(
        tensor.unsqueeze(0).unsqueeze(0),
        size=(image_size[1], image_size[0]),
        mode="bilinear",
        align_corners=False,
    )[0, 0]

    return _mask_image_from_array(tensor.cpu().numpy(), image_size)


def _coerce_mask_image(mask: Any, image_size: tuple[int, int]) -> Any:
    _require_pillow()

    if mask is None:
        return None

    if hasattr(Image, "Image") and isinstance(mask, Image.Image):
        return mask.convert("L").resize(image_size)

    if hasattr(mask, "detach"):
        mask = mask.detach().cpu().numpy()
    elif hasattr(mask, "numpy"):
        mask = mask.numpy()

    try:
        return _mask_image_from_array(mask, image_size)
    except Exception:
        return None


def _combine_masks(masks: list[Any]) -> Any:
    _require_pillow()

    if not masks:
        return None
    if len(masks) == 1:
        return masks[0]
    if ImageChops is None:
        return masks[0]

    combined = masks[0]
    for mask in masks[1:]:
        combined = ImageChops.lighter(combined, mask)
    return combined


def _extract_mask_from_pipeline(outputs: Any, image_size: tuple[int, int]) -> Any:
    if isinstance(outputs, dict):
        outputs = [outputs]
    if not isinstance(outputs, list):
        return None

    foreground_masks: list[Any] = []
    background_masks: list[Any] = []

    for item in outputs:
        if not isinstance(item, dict):
            continue

        label = str(item.get("label") or "").strip().lower()
        score = float(item.get("score") or 0.0)
        mask = _coerce_mask_image(item.get("mask"), image_size)
        if mask is None:
            continue

        if label in {"background", "bg"}:
            background_masks.append((score, mask))
        else:
            priority = 2 if label in {"foreground", "subject", "object"} else 1
            foreground_masks.append((priority, score, mask))

    if foreground_masks:
        ordered_masks = [
            mask
            for _, _, mask in sorted(
                foreground_masks, key=lambda item: (item[0], item[1]), reverse=True
            )
        ]
        return _combine_masks(ordered_masks)

    if background_masks and ImageOps is not None:
        background_masks.sort(key=lambda item: item[0], reverse=True)
        return ImageOps.invert(background_masks[0][1].convert("L"))

    return None


def _mask_has_foreground(mask: Any) -> bool:
    _require_pillow()
    thresholded = mask.point(lambda value: 255 if value > MIN_MASK_ALPHA else 0)
    return thresholded.getbbox() is not None


def _apply_mask(image: Any, mask: Any) -> Any:
    output = image.convert("RGBA")
    output.putalpha(mask.convert("L"))
    return output


def _remove_background(image_bytes: bytes, budget_ms: int) -> bytes:
    start_monotonic = time.monotonic()
    image = _load_image(image_bytes, mode="RGBA")
    model_bundle = _get_remove_bg_model()

    try:
        if model_bundle["type"] == "auto_model":
            processor = model_bundle["processor"]
            model = model_bundle["model"]
            torch = model_bundle["torch"]
            device = model_bundle["device"]

            inputs = processor(images=image.convert("RGB"), return_tensors="pt")
            for key, value in list(inputs.items()):
                if hasattr(value, "to"):
                    inputs[key] = value.to(device)

            with torch.no_grad():
                outputs = model(**inputs)

            mask = _extract_mask_from_outputs(outputs, image.size, torch)
        else:
            pipeline_image = image.convert("RGB")
            try:
                mask_output = model_bundle["pipeline"](pipeline_image, return_mask=True)
            except TypeError:
                mask_output = None

            mask = _coerce_mask_image(mask_output, image.size)
            if mask is None:
                outputs = model_bundle["pipeline"](pipeline_image)

                if hasattr(Image, "Image") and isinstance(outputs, Image.Image):
                    output_bytes = _image_to_png_bytes(outputs.convert("RGBA"))
                    if not output_bytes:
                        raise UnprocessableImageError(
                            "Background removal produced empty output"
                        )
                    _enforce_stage_budget(start_monotonic, budget_ms, "Inference")
                    return output_bytes

                mask = _extract_mask_from_pipeline(outputs, image.size)
    except RetryableServiceError:
        raise
    except Exception as exc:
        raise RetryableServiceError(f"Background removal failed: {exc}") from exc

    _enforce_stage_budget(start_monotonic, budget_ms, "Inference")

    if mask is None or not _mask_has_foreground(mask):
        raise UnprocessableImageError(
            "Background removal could not isolate a foreground subject"
        )

    processed_image = _apply_mask(image, mask)
    output_bytes = _image_to_png_bytes(processed_image)
    if not output_bytes:
        raise UnprocessableImageError("Background removal produced empty output")

    return output_bytes


def _zoom_background_removed_image(image_bytes: bytes, budget_ms: int) -> bytes:
    start_monotonic = time.monotonic()
    image = _load_image(image_bytes, mode="RGBA")
    alpha = image.getchannel("A").point(lambda value: 255 if value > MIN_MASK_ALPHA else 0)
    bbox = alpha.getbbox()

    if bbox is None:
        _enforce_stage_budget(start_monotonic, budget_ms, "Foreground zoom")
        return image_bytes

    left, top, right, bottom = bbox
    subject_width = max(1, int(right - left))
    subject_height = max(1, int(bottom - top))
    dominant_coverage = max(
        subject_width / max(1, image.width),
        subject_height / max(1, image.height),
    )

    if dominant_coverage >= 0.72:
        _enforce_stage_budget(start_monotonic, budget_ms, "Foreground zoom")
        return image_bytes

    target_coverage = 0.78
    padding_x = max(12, int(subject_width * 0.18))
    padding_y = max(12, int(subject_height * 0.18))
    desired_width = min(
        image.width,
        max(subject_width + (padding_x * 2), int(round(subject_width / target_coverage))),
    )
    desired_height = min(
        image.height,
        max(subject_height + (padding_y * 2), int(round(subject_height / target_coverage))),
    )

    if desired_width >= image.width and desired_height >= image.height:
        _enforce_stage_budget(start_monotonic, budget_ms, "Foreground zoom")
        return image_bytes

    center_x = (left + right) / 2
    center_y = (top + bottom) / 2
    crop_left = int(round(center_x - (desired_width / 2)))
    crop_top = int(round(center_y - (desired_height / 2)))

    crop_left = max(0, min(crop_left, image.width - desired_width))
    crop_top = max(0, min(crop_top, image.height - desired_height))

    crop_box = (
        crop_left,
        crop_top,
        crop_left + desired_width,
        crop_top + desired_height,
    )
    zoomed_image = image.crop(crop_box).resize(image.size, resample=_lanczos_resample())

    _enforce_stage_budget(start_monotonic, budget_ms, "Foreground zoom")
    return _image_to_png_bytes(zoomed_image)


def _get_vision_model() -> dict[str, Any]:
    global _vision_model

    if _vision_model is not None:
        return _vision_model

    torch = _get_torch_module()
    model_kwargs = _transformers_common_kwargs(MODEL_VISION_REVISION)

    try:
        from transformers import AutoModelForCausalLM, AutoTokenizer

        tokenizer = AutoTokenizer.from_pretrained(MODEL_VISION, **model_kwargs)
        model = AutoModelForCausalLM.from_pretrained(MODEL_VISION, **model_kwargs)
        device = "cuda" if torch.cuda.is_available() else "cpu"
        if device != "cpu":
            model = model.to(device)
        model.eval()
        _vision_model = {
            "type": "causal_lm",
            "model": model,
            "tokenizer": tokenizer,
            "torch": torch,
            "device": device,
        }
        return _vision_model
    except Exception as causal_lm_exc:
        logger.warning(
            "vision_model_causal_lm_load_failed model=%s error=%s",
            MODEL_VISION,
            causal_lm_exc,
        )

        try:
            from transformers import AutoModelForVision2Seq, AutoProcessor

            processor = AutoProcessor.from_pretrained(MODEL_VISION, **model_kwargs)
            model = AutoModelForVision2Seq.from_pretrained(MODEL_VISION, **model_kwargs)
            device = "cuda" if torch.cuda.is_available() else "cpu"
            if device != "cpu":
                model = model.to(device)
            model.eval()
            _vision_model = {
                "type": "vision2seq",
                "model": model,
                "processor": processor,
                "torch": torch,
                "device": device,
            }
            return _vision_model
        except Exception as vision2seq_exc:
            logger.warning(
                "vision_model_vision2seq_load_failed model=%s error=%s",
                MODEL_VISION,
                vision2seq_exc,
            )

            try:
                from transformers import pipeline

                pipe = pipeline(
                    "image-to-text",
                    model=MODEL_VISION,
                    device=0 if torch.cuda.is_available() else -1,
                    trust_remote_code=True,
                )
                _vision_model = {"type": "pipeline", "pipeline": pipe}
                return _vision_model
            except Exception as pipeline_exc:
                raise RetryableServiceError(
                    f"Failed to load metadata model {MODEL_VISION}: {pipeline_exc}"
                ) from causal_lm_exc


def _coerce_model_text(result: Any) -> str:
    if result is None:
        return ""

    if isinstance(result, str):
        return result.strip()

    if isinstance(result, dict):
        for key in ("answer", "text", "response", "caption", "generated_text"):
            value = result.get(key)
            if isinstance(value, str):
                return value.strip()
        return json.dumps(result)

    if isinstance(result, list):
        for item in result:
            text = _coerce_model_text(item)
            if text:
                return text
        return ""

    return str(result).strip()


def _build_metadata_prompt(category: str) -> str:
    return (
        f"Look at this {category} image and identify the brand, model, and colorway. "
        "Return strict JSON with exactly these keys: brand, model, colorway. "
        "Use an empty string for any field you cannot determine confidently. "
        "Do not guess and do not include extra commentary."
    )


def _run_causal_lm_prompt(image: Any, prompt: str, model_bundle: dict[str, Any]) -> str:
    model = model_bundle["model"]
    tokenizer = model_bundle["tokenizer"]

    if hasattr(model, "query"):
        return _coerce_model_text(model.query(image, prompt))

    if hasattr(model, "answer_question"):
        if hasattr(model, "encode_image"):
            encoded_image = model.encode_image(image)
            return _coerce_model_text(
                model.answer_question(encoded_image, prompt, tokenizer)
            )
        return _coerce_model_text(model.answer_question(image, prompt, tokenizer))

    if hasattr(model, "caption"):
        return _coerce_model_text(model.caption(image))

    raise RetryableServiceError(
        f"Metadata model {MODEL_VISION} does not expose a supported inference API"
    )


def _run_vision2seq_prompt(image: Any, prompt: str, model_bundle: dict[str, Any]) -> str:
    model = model_bundle["model"]
    processor = model_bundle["processor"]
    torch = model_bundle["torch"]
    device = model_bundle["device"]

    try:
        inputs = processor(images=image, text=prompt, return_tensors="pt")
    except TypeError:
        inputs = processor(images=image, return_tensors="pt")

    for key, value in list(inputs.items()):
        if hasattr(value, "to"):
            inputs[key] = value.to(device)

    with torch.no_grad():
        generated = model.generate(**inputs, max_new_tokens=128)

    if hasattr(processor, "batch_decode"):
        decoded = processor.batch_decode(generated, skip_special_tokens=True)
    else:
        decoded = generated

    return _coerce_model_text(decoded)


def _run_pipeline_prompt(image: Any, prompt: str, model_bundle: dict[str, Any]) -> str:
    pipe = model_bundle["pipeline"]

    try:
        return _coerce_model_text(pipe(image, prompt=prompt))
    except TypeError:
        return _coerce_model_text(pipe(image))


def _extract_json_blob(text: str) -> dict[str, Any] | None:
    match = re.search(r"\{[\s\S]*\}", text)
    if not match:
        return None

    candidate = match.group(0)
    for payload in (
        candidate,
        re.sub(r",\s*([}\]])", r"\1", candidate),
    ):
        try:
            loaded = json.loads(payload)
            return loaded if isinstance(loaded, dict) else None
        except json.JSONDecodeError:
            continue

    return None


def _extract_key_value_pairs(text: str) -> dict[str, Any] | None:
    pairs: dict[str, Any] = {}

    for key, value in re.findall(
        r"(?i)(brand|model|colorway)\s*[:=-]\s*([^\n;,]+)", text
    ):
        pairs[key.lower()] = value.strip()

    return pairs or None


def _normalize_metadata_value(value: Any, default_confidence: float = 0.5) -> dict[str, Any] | None:
    if value is None:
        return None

    explicit_confidence = None
    if isinstance(value, dict):
        explicit_confidence = value.get("confidence")
        value = value.get("value")

    normalized_value = str(value).strip() if value is not None else ""
    if normalized_value.lower() in UNKNOWN_MARKERS:
        return None

    confidence = (
        float(explicit_confidence)
        if isinstance(explicit_confidence, (int, float))
        else default_confidence
    )
    confidence = max(0.0, min(1.0, confidence))

    if isinstance(explicit_confidence, (int, float)) and confidence < 0.35:
        return None

    return {"value": normalized_value, "confidence": confidence}


def _parse_metadata_response(raw_text: str) -> dict[str, Any]:
    payload = _extract_json_blob(raw_text) or _extract_key_value_pairs(raw_text) or {}

    return {
        "brand": _normalize_metadata_value(payload.get("brand")),
        "model": _normalize_metadata_value(payload.get("model")),
        "colorway": _normalize_metadata_value(payload.get("colorway")),
    }


def _extract_metadata(image_bytes: bytes, category: str, budget_ms: int) -> dict[str, Any]:
    start_monotonic = time.monotonic()
    image = _load_image(image_bytes, mode="RGB")
    model_bundle = _get_vision_model()
    prompt = _build_metadata_prompt(category)

    try:
        if model_bundle["type"] == "causal_lm":
            raw_text = _run_causal_lm_prompt(image, prompt, model_bundle)
        elif model_bundle["type"] == "vision2seq":
            raw_text = _run_vision2seq_prompt(image, prompt, model_bundle)
        else:
            raw_text = _run_pipeline_prompt(image, prompt, model_bundle)
    except RetryableServiceError:
        raise
    except Exception as exc:
        raise RetryableServiceError(f"Metadata extraction failed: {exc}") from exc

    _enforce_stage_budget(start_monotonic, budget_ms, "Metadata")

    if not raw_text:
        return _empty_metadata()

    return _parse_metadata_response(raw_text)


_configure_cloudinary()

app = FastAPI(title="Klectr AI Processing Service", version="0.2.0")


def warm_models() -> None:
    _get_remove_bg_model()
    _get_vision_model()


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(
        status="ok",
        models={
            "remove_background": {
                "model": MODEL_REMOVE_BG,
                "loaded": _remove_bg_model is not None,
            },
            "vision": {
                "model": MODEL_VISION,
                "loaded": _vision_model is not None,
            },
            "cloudinaryConfigured": _cloudinary_configured(),
            "storage": {
                "driver": _get_storage_driver(),
                "configured": _storage_configured(),
                "publicBaseUrl": _get_storage_public_base_url(),
                "internalBaseUrl": _get_storage_internal_base_url() or None,
            },
            "pythonSupported": _python_supported(),
        },
    )


@app.post("/analyze", response_model=AnalyzeResponse)
def analyze(
    request: AnalyzeRequest,
    x_request_id: str | None = Header(default=None),
    x_correlation_id: str | None = Header(default=None),
    x_asset_id: str | None = Header(default=None),
    x_job_id: str | None = Header(default=None),
) -> AnalyzeResponse:
    if not request.category.strip():
        raise HTTPException(
            status_code=400,
            detail=ErrorResponse(
                error=ErrorPayload(
                    message="Invalid request: category is required",
                    code="invalid_request",
                )
            ).model_dump(),
        )

    request_id = x_request_id or str(uuid.uuid4())
    correlation_id = x_correlation_id or request_id
    start_monotonic = time.monotonic()

    def remaining_ms() -> int:
        elapsed = int((time.monotonic() - start_monotonic) * 1000)
        return max(0, TOTAL_BUDGET_MS - elapsed)

    try:
        download_budget = _stage_budget(remaining_ms(), DOWNLOAD_BUDGET_MS, "Download")
        original_bytes = _download_image_bytes(
            _rewrite_download_url(str(request.image_url)),
            download_budget,
        )

        inference_budget = _stage_budget(
            remaining_ms(), INFERENCE_BUDGET_MS, "Inference"
        )
        processed_bytes = _remove_background(original_bytes, inference_budget)

        postprocess_budget = _stage_budget(
            remaining_ms(), INFERENCE_BUDGET_MS, "Foreground zoom"
        )
        try:
            processed_bytes = _zoom_background_removed_image(
                processed_bytes,
                postprocess_budget,
            )
        except BudgetExceededError:
            raise
        except Exception as zoom_exc:
            logger.warning(
                "foreground_zoom_fallback requestId=%s correlationId=%s assetId=%s jobId=%s category=%s error=%s",
                request_id,
                correlation_id,
                x_asset_id,
                x_job_id,
                request.category,
                zoom_exc,
            )

        upload_budget = _stage_budget(remaining_ms(), UPLOAD_BUDGET_MS, "Upload")
        processed_image_url = _upload_processed_image(
            processed_bytes, request.category, upload_budget
        )

        if not processed_image_url:
            raise RetryableServiceError("Processed image URL is missing")

        metadata = _empty_metadata()
        try:
            metadata_budget = _stage_budget(remaining_ms(), INFERENCE_BUDGET_MS, "Metadata")
            metadata = _extract_metadata(
                original_bytes, request.category, metadata_budget
            )
        except Exception as metadata_exc:
            logger.warning(
                "metadata_extraction_fallback requestId=%s correlationId=%s assetId=%s jobId=%s category=%s error=%s",
                request_id,
                correlation_id,
                x_asset_id,
                x_job_id,
                request.category,
                metadata_exc,
            )
            metadata = _empty_metadata()

        duration_ms = int((time.monotonic() - start_monotonic) * 1000)
        logger.info(
            "analyze_completed requestId=%s correlationId=%s assetId=%s jobId=%s category=%s durationMs=%s hasProcessedImage=%s",
            request_id,
            correlation_id,
            x_asset_id,
            x_job_id,
            request.category,
            duration_ms,
            bool(processed_image_url),
        )

        return AnalyzeResponse(
            processed_image_url=processed_image_url,
            processedImageUrl=processed_image_url,
            brand=metadata.get("brand"),
            model=metadata.get("model"),
            colorway=metadata.get("colorway"),
        )
    except UnprocessableImageError as exc:
        raise HTTPException(
            status_code=422,
            detail=ErrorResponse(
                error=ErrorPayload(
                    message=str(exc),
                    code="unprocessable_image",
                )
            ).model_dump(),
        ) from exc
    except BudgetExceededError as exc:
        raise HTTPException(
            status_code=500,
            detail=ErrorResponse(
                error=ErrorPayload(
                    message=str(exc),
                    code="retryable_error",
                )
            ).model_dump(),
        ) from exc
    except RetryableServiceError as exc:
        raise HTTPException(
            status_code=500,
            detail=ErrorResponse(
                error=ErrorPayload(
                    message=str(exc),
                    code="retryable_error",
                )
            ).model_dump(),
        ) from exc
    except Exception as exc:
        logger.exception(
            "analyze_failed requestId=%s correlationId=%s assetId=%s jobId=%s error=%s",
            request_id,
            correlation_id,
            x_asset_id,
            x_job_id,
            exc,
        )
        raise HTTPException(
            status_code=500,
            detail=ErrorResponse(
                error=ErrorPayload(
                    message=f"Internal processing error: {exc}",
                    code="retryable_error",
                )
            ).model_dump(),
        ) from exc


@app.post("/enhance-image", response_model=EnhanceImageResponse)
def enhance_image(
    request: EnhanceImageRequest,
    x_request_id: str | None = Header(default=None),
    x_correlation_id: str | None = Header(default=None),
    x_asset_id: str | None = Header(default=None),
    x_job_id: str | None = Header(default=None),
) -> EnhanceImageResponse:
    request_id = x_request_id or str(uuid.uuid4())
    correlation_id = x_correlation_id or request_id
    start_monotonic = time.monotonic()

    def remaining_ms() -> int:
        elapsed = int((time.monotonic() - start_monotonic) * 1000)
        return max(0, TOTAL_BUDGET_MS - elapsed)

    try:
        download_budget = _stage_budget(remaining_ms(), DOWNLOAD_BUDGET_MS, "Download")
        original_bytes = _download_image_bytes(
            _rewrite_download_url(str(request.image_url)),
            download_budget,
        )

        enhancement_budget = _stage_budget(
            remaining_ms(), INFERENCE_BUDGET_MS, "Enhancement"
        )
        enhanced_bytes, size = _enhance_image(
            original_bytes,
            request.options,
            enhancement_budget,
        )

        upload_budget = _stage_budget(remaining_ms(), UPLOAD_BUDGET_MS, "Upload")
        enhanced_image_url = _upload_enhanced_image(enhanced_bytes, upload_budget)

        if not enhanced_image_url:
            raise RetryableServiceError("Enhanced image URL is missing")

        duration_ms = int((time.monotonic() - start_monotonic) * 1000)
        logger.info(
            "enhance_image_completed requestId=%s correlationId=%s assetId=%s jobId=%s durationMs=%s width=%s height=%s",
            request_id,
            correlation_id,
            x_asset_id,
            x_job_id,
            duration_ms,
            size[0],
            size[1],
        )

        return EnhanceImageResponse(
            enhanced_image_url=enhanced_image_url,
            enhancedImageUrl=enhanced_image_url,
            width=int(size[0]),
            height=int(size[1]),
        )
    except UnprocessableImageError as exc:
        raise HTTPException(
            status_code=422,
            detail=ErrorResponse(
                error=ErrorPayload(
                    message=str(exc),
                    code="unprocessable_image",
                )
            ).model_dump(),
        ) from exc
    except BudgetExceededError as exc:
        raise HTTPException(
            status_code=500,
            detail=ErrorResponse(
                error=ErrorPayload(
                    message=str(exc),
                    code="retryable_error",
                )
            ).model_dump(),
        ) from exc
    except RetryableServiceError as exc:
        raise HTTPException(
            status_code=500,
            detail=ErrorResponse(
                error=ErrorPayload(
                    message=str(exc),
                    code="retryable_error",
                )
            ).model_dump(),
        ) from exc
    except Exception as exc:
        logger.exception(
            "enhance_image_failed requestId=%s correlationId=%s assetId=%s jobId=%s error=%s",
            request_id,
            correlation_id,
            x_asset_id,
            x_job_id,
            exc,
        )
        raise HTTPException(
            status_code=500,
            detail=ErrorResponse(
                error=ErrorPayload(
                    message=f"Internal enhancement error: {exc}",
                    code="retryable_error",
                )
            ).model_dump(),
        ) from exc


@app.exception_handler(HTTPException)
async def http_exception_handler(_: Request, exc: HTTPException) -> JSONResponse:
    if isinstance(exc.detail, dict) and "error" in exc.detail:
        payload = exc.detail
    else:
        payload = ErrorResponse(
            error=ErrorPayload(message=str(exc.detail), code="http_error")
        ).model_dump()

    return JSONResponse(status_code=exc.status_code, content=payload)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    _: Request, exc: RequestValidationError
) -> JSONResponse:
    payload = ErrorResponse(
        error=ErrorPayload(
            message="Invalid request",
            code="invalid_request",
            details=exc.errors(),
        )
    ).model_dump()
    return JSONResponse(status_code=422, content=payload)
