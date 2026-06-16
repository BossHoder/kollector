import io

import main
from PIL import Image, ImageDraw


def _build_large_photo_like_jpeg() -> bytes:
    image = Image.new("RGB", (2400, 1800), "white")
    pixels = image.load()

    for y in range(image.height):
        for x in range(image.width):
            pixels[x, y] = (
                40 + (x * 130 // image.width),
                70 + (y * 120 // image.height),
                110 + ((x + y) * 70 // (image.width + image.height)),
            )

    draw = ImageDraw.Draw(image)
    for index in range(120):
        x = (index * 137) % image.width
        y = (index * 89) % image.height
        draw.ellipse(
            [x, y, min(image.width, x + 220), min(image.height, y + 140)],
            outline=(230, 230, 220),
            width=5,
        )

    output = io.BytesIO()
    image.save(output, format="JPEG", quality=95)
    return output.getvalue()


def test_enhance_image_compresses_to_webp_kilobytes():
    original_bytes = _build_large_photo_like_jpeg()

    enhanced_bytes, size = main._enhance_image(
        original_bytes,
        main.EnhancementOptions(),
        budget_ms=10_000,
    )

    with Image.open(io.BytesIO(enhanced_bytes)) as enhanced_image:
        assert enhanced_image.format == "WEBP"

    assert size[0] <= 2048
    assert size[1] <= 2048
    assert len(enhanced_bytes) <= main.DEFAULT_IMAGE_TARGET_BYTES
    assert len(enhanced_bytes) < len(original_bytes)
