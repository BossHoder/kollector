const fs = require('fs');
const os = require('os');
const path = require('path');

describe('Storage adapter', () => {
  const originalEnv = process.env;
  let tempStorageRoot;

  beforeEach(() => {
    jest.resetModules();
    tempStorageRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'kollector-storage-'));
    process.env = {
      ...originalEnv,
      STORAGE_DRIVER: 'local',
      STORAGE_ROOT: tempStorageRoot,
      STORAGE_PUBLIC_BASE_URL: 'http://localhost:3000'
    };
  });

  afterEach(async () => {
    process.env = originalEnv;
    if (tempStorageRoot) {
      await fs.promises.rm(tempStorageRoot, { recursive: true, force: true });
    }
  });

  it('uploads files to local storage and returns a public URL', async () => {
    const {
      uploadImage,
      extractPublicIdFromUrl
    } = require('../../../src/config/cloudinary');

    const result = await uploadImage(Buffer.from('image-bytes'), {
      folder: 'assets/originals',
      originalFilename: 'test-image.png',
      mimetype: 'image/png'
    });

    const uploadedFilePath = path.join(
      tempStorageRoot,
      result.publicId.split('/').join(path.sep)
    );

    expect(result.url).toBe(`http://localhost:3000/uploads/${result.publicId}`);
    expect(result.publicId).toMatch(/^assets\/originals\/.+\.png$/);
    expect(fs.existsSync(uploadedFilePath)).toBe(true);
    expect(extractPublicIdFromUrl(result.url)).toBe(result.publicId);
  });

  it('deletes a locally stored file by public id', async () => {
    const {
      uploadImage,
      deleteImage
    } = require('../../../src/config/cloudinary');

    const result = await uploadImage(Buffer.from('image-bytes'), {
      folder: 'assets/originals',
      originalFilename: 'delete-me.jpg',
      mimetype: 'image/jpeg'
    });
    const uploadedFilePath = path.join(
      tempStorageRoot,
      result.publicId.split('/').join(path.sep)
    );

    expect(fs.existsSync(uploadedFilePath)).toBe(true);

    await deleteImage(result.publicId);

    expect(fs.existsSync(uploadedFilePath)).toBe(false);
  });
});
