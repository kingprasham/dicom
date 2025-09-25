// Professional Multi-Planar Reconstruction Manager
// Based on OsiriX/3D Slicer algorithms and DICOM standards
window.DICOM_VIEWER.MPRManager = class {
  constructor() {
    this.volumeData = null;
    this.dimensions = { width: 0, height: 0, depth: 0 };
    this.spacing = { x: 1, y: 1, z: 1 };
    this.origin = { x: 0, y: 0, z: 0 };
    this.images = [];
    this.pixelData = null;
    this.isBuilding = false;
    this.buildProgress = 0;

    // Professional MPR parameters
    this.transformMatrix = null;
    this.inverseTransformMatrix = null;
    this.globalWindowWidth = 400;
    this.globalWindowCenter = 40;
    this.globalMinPixel = -1024;
    this.globalMaxPixel = 3071;
    this.interpolationMethod = "trilinear"; // trilinear, nearest, cubic

    // Volume data as typed array for performance
    this.volume = null;
    this.volumeMetadata = {};

    console.log("Professional MPR Manager initialized");
  }

  // Add this method to debug slice data
  debugSliceData(sliceData, orientation) {
    console.log(`=== DEBUG ${orientation.toUpperCase()} SLICE ===`);

    const stats = this.calculateSliceStatistics(sliceData);
    console.log("Statistics:", stats);

    // Sample some pixel values
    const sampleIndices = [
      0,
      Math.floor(sliceData.length / 4),
      Math.floor(sliceData.length / 2),
      Math.floor((sliceData.length * 3) / 4),
      sliceData.length - 1,
    ];
    const samples = sampleIndices.map((i) => sliceData[i]);
    console.log("Sample values at indices:", sampleIndices, "=", samples);

    // Check for data patterns
    const uniqueValues = [...new Set(Array.from(sliceData))].sort(
      (a, b) => a - b
    );
    console.log(`Unique values: ${uniqueValues.length} different values`);
    console.log(
      "Value range:",
      uniqueValues[0],
      "to",
      uniqueValues[uniqueValues.length - 1]
    );

    return stats;
  }

  // DICOM coordinate system utilities
  static createTransformMatrix(imagePosition, imageOrientation, pixelSpacing) {
    const [px, py, pz] = imagePosition || [0, 0, 0];
    const [xx, xy, xz, yx, yy, yz] = imageOrientation || [1, 0, 0, 0, 1, 0];
    const [sx, sy] = pixelSpacing || [1, 1];

    // Calculate Z direction (slice normal) using cross product
    const zx = xy * yz - xz * yy;
    const zy = xz * yx - xx * yz;
    const zz = xx * yy - xy * yx;

    // Normalize Z direction
    const zLength = Math.sqrt(zx * zx + zy * zy + zz * zz);
    const nzx = zLength > 0 ? zx / zLength : 0;
    const nzy = zLength > 0 ? zy / zLength : 0;
    const nzz = zLength > 0 ? zz / zLength : 1;

    return {
      matrix: new Float32Array([
        xx * sx,
        yx * sy,
        nzx,
        px,
        xy * sx,
        yy * sy,
        nzy,
        py,
        xz * sx,
        yz * sy,
        nzz,
        pz,
        0,
        0,
        0,
        1,
      ]),
      spacing: [sx, sy, 1],
      origin: [px, py, pz],
      orientation: [xx, xy, xz, yx, yy, yz, nzx, nzy, nzz],
    };
  }

  static invertMatrix4x4(matrix) {
    const inv = new Float32Array(16);
    const m = matrix;

    inv[0] =
      m[5] * m[10] * m[15] -
      m[5] * m[11] * m[14] -
      m[9] * m[6] * m[15] +
      m[9] * m[7] * m[14] +
      m[13] * m[6] * m[11] -
      m[13] * m[7] * m[10];
    inv[4] =
      -m[4] * m[10] * m[15] +
      m[4] * m[11] * m[14] +
      m[8] * m[6] * m[15] -
      m[8] * m[7] * m[14] -
      m[12] * m[6] * m[11] +
      m[12] * m[7] * m[10];
    inv[8] =
      m[4] * m[9] * m[15] -
      m[4] * m[11] * m[13] -
      m[8] * m[5] * m[15] +
      m[8] * m[7] * m[13] +
      m[12] * m[5] * m[11] -
      m[12] * m[7] * m[9];
    inv[12] =
      -m[4] * m[9] * m[14] +
      m[4] * m[10] * m[13] +
      m[8] * m[5] * m[14] -
      m[8] * m[6] * m[13] -
      m[12] * m[5] * m[10] +
      m[12] * m[6] * m[9];

    inv[1] =
      -m[1] * m[10] * m[15] +
      m[1] * m[11] * m[14] +
      m[9] * m[2] * m[15] -
      m[9] * m[3] * m[14] -
      m[13] * m[2] * m[11] +
      m[13] * m[3] * m[10];
    inv[5] =
      m[0] * m[10] * m[15] -
      m[0] * m[11] * m[14] -
      m[8] * m[2] * m[15] +
      m[8] * m[3] * m[14] +
      m[12] * m[2] * m[11] -
      m[12] * m[3] * m[10];
    inv[9] =
      -m[0] * m[9] * m[15] +
      m[0] * m[11] * m[13] +
      m[8] * m[1] * m[15] -
      m[8] * m[3] * m[13] -
      m[12] * m[1] * m[11] +
      m[12] * m[3] * m[9];
    inv[13] =
      m[0] * m[9] * m[14] -
      m[0] * m[10] * m[13] -
      m[8] * m[1] * m[14] +
      m[8] * m[2] * m[13] +
      m[12] * m[1] * m[10] -
      m[12] * m[2] * m[9];

    inv[2] =
      m[1] * m[6] * m[15] -
      m[1] * m[7] * m[14] -
      m[5] * m[2] * m[15] +
      m[5] * m[3] * m[14] +
      m[13] * m[2] * m[7] -
      m[13] * m[3] * m[6];
    inv[6] =
      -m[0] * m[6] * m[15] +
      m[0] * m[7] * m[14] +
      m[4] * m[2] * m[15] -
      m[4] * m[3] * m[14] -
      m[12] * m[2] * m[7] +
      m[12] * m[3] * m[6];
    inv[10] =
      m[0] * m[5] * m[15] -
      m[0] * m[7] * m[13] -
      m[4] * m[1] * m[15] +
      m[4] * m[3] * m[13] +
      m[12] * m[1] * m[7] -
      m[12] * m[3] * m[5];
    inv[14] =
      -m[0] * m[5] * m[14] +
      m[0] * m[6] * m[13] +
      m[4] * m[1] * m[14] -
      m[4] * m[2] * m[13] -
      m[12] * m[1] * m[6] +
      m[12] * m[2] * m[5];

    inv[3] =
      -m[1] * m[6] * m[11] +
      m[1] * m[7] * m[10] +
      m[5] * m[2] * m[11] -
      m[5] * m[3] * m[10] -
      m[9] * m[2] * m[7] +
      m[9] * m[3] * m[6];
    inv[7] =
      m[0] * m[6] * m[11] -
      m[0] * m[7] * m[10] -
      m[4] * m[2] * m[11] +
      m[4] * m[3] * m[10] +
      m[8] * m[2] * m[7] -
      m[8] * m[3] * m[6];
    inv[11] =
      -m[0] * m[5] * m[11] +
      m[0] * m[7] * m[9] +
      m[4] * m[1] * m[11] -
      m[4] * m[3] * m[9] -
      m[8] * m[1] * m[7] +
      m[8] * m[3] * m[5];
    inv[15] =
      m[0] * m[5] * m[10] -
      m[0] * m[6] * m[9] -
      m[4] * m[1] * m[10] +
      m[4] * m[2] * m[9] +
      m[8] * m[1] * m[6] -
      m[8] * m[2] * m[5];

    const det = m[0] * inv[0] + m[1] * inv[4] + m[2] * inv[8] + m[3] * inv[12];

    if (Math.abs(det) < 1e-10) {
      return null; // Matrix is not invertible
    }

    const detInv = 1.0 / det;
    for (let i = 0; i < 16; i++) {
      inv[i] *= detInv;
    }

    return inv;
  }

  // Professional volume building from image series
// Professional volume building from image series (with BATCH PROCESSING and METADATA AWARENESS)
async buildVolume(imageIds) {
    console.log(
      "Building professional MPR volume from",
      imageIds.length,
      "images using batch processing..."
    );

    if (this.isBuilding) {
        console.warn("Volume build already in progress, request ignored.");
        return false;
    }

    this.isBuilding = true;
    this.buildProgress = 0;
    window.DICOM_VIEWER.showLoadingIndicator(`Building 3D volume: 0%`);

    try {
        // Clear previous data
        this.images = [];
        this.volume = null;
        this.volumeMetadata = {};

        const batchSize = 25;
        const totalImages = imageIds.length;
        let loadedImageObjects = [];

        for (let i = 0; i < totalImages; i += batchSize) {
            const batch = imageIds.slice(i, i + batchSize);
            const batchPromises = batch.map(async (imageId, indexInBatch) => {
                const globalIndex = i + indexInBatch;
                try {
                    const image = await cornerstone.loadImage(imageId);
                    this.fixPixelValueRange(image);
                    // Return the imageId along with the image object and its original index
                    return { image, imageId, index: globalIndex };
                } catch (error) {
                    console.error(`Failed to load image ${globalIndex + 1}/${totalImages}:`, error);
                    return null;
                }
            });

            const batchResults = await Promise.all(batchPromises);
            loadedImageObjects.push(...batchResults);

            this.buildProgress = (i + batch.length) / totalImages;
            window.DICOM_VIEWER.showLoadingIndicator(`Building 3D volume: ${Math.round(this.buildProgress * 100)}%`);
        }
        
        // this.images now stores objects with image, imageId, and original index
        this.images = loadedImageObjects.filter((result) => result !== null);

        if (this.images.length < 3) {
            throw new Error(`Failed to load a sufficient number of images. Only loaded ${this.images.length}/${totalImages}.`);
        }

        console.log(`Successfully loaded ${this.images.length}/${totalImages} image objects for professional MPR`);

        // Sort images by position for proper volume reconstruction
        this.sortImagesByPosition();

        // Extract volume metadata from first image
        this.extractVolumeMetadata();

        // Build 3D volume with proper coordinate system
        this.buildVolumeData();

        // Create transformation matrices
        this.setupCoordinateTransforms();

        this.buildProgress = 1.0;
        this.volumeData = true;

        console.log("Professional MPR volume build completed successfully");
        console.log("Volume dimensions:", this.dimensions);
        console.log("Volume spacing:", this.spacing);
        console.log("Volume origin:", this.origin);

        window.DICOM_VIEWER.hideLoadingIndicator();
        return true;

    } catch (error) {
        console.error("Error building professional MPR volume:", error);
        this.volumeData = null;
        window.DICOM_VIEWER.showErrorMessage(`MPR Build Failed: ${error.message}`);
        return false;
    } finally {
        this.isBuilding = false;
    }
}

  // Fix pixel value ranges (critical for preventing black images)
  fixPixelValueRange(image) {
    const pixelData = image.getPixelData();
    if (!pixelData || pixelData.length === 0) {
      console.warn("No pixel data found in image");
      return;
    }

    let min = Number.MAX_VALUE;
    let max = Number.MIN_VALUE;
    let sum = 0;

    // Calculate actual min/max from pixel data
    for (let i = 0; i < pixelData.length; i++) {
      const pixel = pixelData[i];
      if (pixel < min) min = pixel;
      if (pixel > max) max = pixel;
      sum += pixel;
    }

    // Update image properties
    image.minPixelValue = min;
    image.maxPixelValue = max;

    // Calculate proper window/level if not present or invalid
    if (
      !image.windowCenter ||
      !image.windowWidth ||
      image.windowCenter === 0 ||
      image.windowWidth === 0
    ) {
      const mean = sum / pixelData.length;

      // Use histogram-based approach for better windowing
      image.windowCenter = Math.round((max + min) / 2);
      image.windowWidth = Math.round((max - min) * 0.8);

      // Ensure minimum window width
      if (image.windowWidth < 1) {
        image.windowWidth = Math.max(1, max - min);
      }
    }

    // Update global ranges
    this.globalMinPixel = Math.min(this.globalMinPixel, min);
    this.globalMaxPixel = Math.max(this.globalMaxPixel, max);

    console.log(
      `Image pixel range: ${min} to ${max}, W/L: ${image.windowWidth}/${image.windowCenter}`
    );
  }

// Sort images by physical position using the Cornerstone metadata provider
// Sort images by physical position with extensive debugging
sortImagesByPosition() {
    console.log("Attempting to sort images using cornerstone.metaData provider with extensive debugging...");

    try {
        // Log details for the first image to inspect its properties
        if (this.images.length > 0) {
            const firstImageObject = this.images[0];
            console.log("--- DEBUG: Properties of the first cornerstone 'image' object ---");
            console.dir(firstImageObject.image);
            console.log("--- DEBUG: Metadata for the first image ID from the 'imagePlaneModule' ---");
            console.dir(cornerstone.metaData.get('imagePlaneModule', firstImageObject.imageId));
            console.log("--- DEBUG: Metadata for the first image ID from the 'generalSeriesModule' ---");
            console.dir(cornerstone.metaData.get('generalSeriesModule', firstImageObject.imageId));
        }

        let missingMetaDataCount = 0;
        this.images.sort((a, b) => {
            const imagePlaneA = cornerstone.metaData.get('imagePlaneModule', a.imageId);
            const imagePlaneB = cornerstone.metaData.get('imagePlaneModule', b.imageId);

            if (imagePlaneA?.imagePositionPatient && imagePlaneB?.imagePositionPatient) {
                return imagePlaneA.imagePositionPatient[2] - imagePlaneB.imagePositionPatient[2];
            } else {
                missingMetaDataCount++;
                const instanceA = a.image.instanceNumber || 0;
                const instanceB = b.image.instanceNumber || 0;
                return instanceA - instanceB;
            }
        });

        if (missingMetaDataCount > 0) {
            console.warn(`Could not find positioning metadata for ${missingMetaDataCount} of ${this.images.length} images. Used instance number as a fallback.`);
        } else {
            console.log("Successfully sorted all images using ImagePositionPatient from metadata.");
        }

    } catch (error) {
        console.error("Error during metadata-based sorting. Falling back to instance number for all images.", error);
        this.images.sort((a, b) => (a.image.instanceNumber || 0) - (b.image.instanceNumber || 0));
    }
}

  // Extract volume metadata from images
extractVolumeMetadata() {
    // We now use imageObject.image to access the cornerstone image
    const firstImage = this.images[0].image;
    const lastImage = this.images[this.images.length - 1].image;
    const firstImageId = this.images[0].imageId; // Get imageId for metadata lookup

    // Volume dimensions
    this.dimensions = {
      width: firstImage.width || firstImage.columns,
      height: firstImage.height || firstImage.rows,
      depth: this.images.length,
    };
    
    // Get metadata using the reliable provider
    const imagePlane = cornerstone.metaData.get('imagePlaneModule', firstImageId);
    const seriesData = cornerstone.metaData.get('generalSeriesModule', firstImageId);
    
    const imagePositionPatient = imagePlane?.imagePositionPatient || [0, 0, 0];
    const imageOrientationPatient = imagePlane?.imageOrientationPatient || [1, 0, 0, 0, 1, 0];
    const pixelSpacing = imagePlane?.pixelSpacing || [1, 1];
    let sliceThickness = seriesData?.sliceThickness || 1;

    // Calculate slice spacing more accurately
    if (this.images.length > 1) {
        const lastImageId = this.images[this.images.length - 1].imageId;
        const lastImagePlane = cornerstone.metaData.get('imagePlaneModule', lastImageId);
        if (imagePlane?.imagePositionPatient && lastImagePlane?.imagePositionPatient) {
            const firstPos = imagePlane.imagePositionPatient;
            const lastPos = lastImagePlane.imagePositionPatient;
            const distance = Math.sqrt(
                Math.pow(lastPos[0] - firstPos[0], 2) +
                Math.pow(lastPos[1] - firstPos[1], 2) +
                Math.pow(lastPos[2] - firstPos[2], 2)
            );
            // Avoid division by zero if there's only one slice position
            if (this.images.length > 1) {
                sliceThickness = distance / (this.images.length - 1);
            }
        }
    }

    this.spacing = {
      x: pixelSpacing[0],
      y: pixelSpacing[1],
      z: sliceThickness,
    };

    this.origin = {
      x: imagePositionPatient[0],
      y: imagePositionPatient[1],
      z: imagePositionPatient[2],
    };

    console.log("Volume metadata extracted using metadata provider:", {
      dimensions: this.dimensions,
      spacing: this.spacing,
      origin: this.origin,
    });
}


  // Add this new method to validate volume data
  validateVolumeData() {
    const { width, height, depth } = this.dimensions;

    // Sample different regions of the volume
    const samples = [
      {
        x: Math.floor(width / 4),
        y: Math.floor(height / 4),
        z: Math.floor(depth / 4),
      },
      {
        x: Math.floor(width / 2),
        y: Math.floor(height / 2),
        z: Math.floor(depth / 2),
      },
      {
        x: Math.floor((3 * width) / 4),
        y: Math.floor((3 * height) / 4),
        z: Math.floor((3 * depth) / 4),
      },
    ];

    samples.forEach((sample, i) => {
      const index = sample.z * height * width + sample.y * width + sample.x;
      const value = this.volume[index];
      console.log(
        `Volume sample ${i + 1} at (${sample.x},${sample.y},${
          sample.z
        }): ${value}`
      );
    });

    // Count non-zero voxels
    const nonZeroVoxels = Array.from(this.volume).filter((v) => v !== 0).length;
    const fillRatio = nonZeroVoxels / this.volume.length;
    console.log(
      `Volume validation: ${(fillRatio * 100).toFixed(
        2
      )}% filled (${nonZeroVoxels}/${this.volume.length})`
    );

    return fillRatio;
  }

  // Build volume data array with proper handling
buildVolumeData() {
    const { width, height, depth } = this.dimensions;
    const totalVoxels = width * height * depth;
    
    console.log(`Building volume: ${width}x${height}x${depth} = ${totalVoxels} voxels`);
    
    this.volume = new Float32Array(totalVoxels);
    
    // We now use imageObject.image to access the cornerstone image
    this.images.forEach((imageObject, z) => {
        const image = imageObject.image;
        const pixelData = image.getPixelData();
        if (!pixelData) {
            console.warn(`No pixel data for slice ${z}`);
            return;
        }
        
        const slope = image.slope || 1;
        const intercept = image.intercept || 0;
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const pixelIndex = y * width + x;
                let pixelValue = pixelData[pixelIndex];
                pixelValue = pixelValue * slope + intercept;
                
                const volumeIndex = z * (height * width) + y * width + x;
                this.volume[volumeIndex] = pixelValue;
            }
        }
    });
    
    console.log(`Volume built: ${this.volume.length} voxels`);
    const nonZero = Array.from(this.volume).filter(v => v !== 0).length;
    console.log(`Volume fill: ${(nonZero/totalVoxels*100).toFixed(1)}% non-zero`);
}
  // Setup coordinate transformation matrices
  setupCoordinateTransforms() {
    const meta = this.volumeMetadata;

    const transform = this.constructor.createTransformMatrix(
      meta.imagePositionPatient,
      meta.imageOrientationPatient,
      meta.pixelSpacing
    );

    this.transformMatrix = transform.matrix;
    this.inverseTransformMatrix = this.constructor.invertMatrix4x4(
      this.transformMatrix
    );

    if (!this.inverseTransformMatrix) {
      console.error("Failed to create inverse transform matrix");
      // Create identity matrix as fallback
      this.inverseTransformMatrix = new Float32Array([
        1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1,
      ]);
    }

    console.log("Coordinate transformation matrices created");
  }

  // Professional trilinear interpolation
// Professional trilinear interpolation to sample the volume at a non-integer 3D coordinate
sampleVolumeTrilinear(x, y, z) {
    const { width, height, depth } = this.dimensions;

    // Clamp coordinates to be within the volume bounds
    x = Math.max(0, Math.min(width - 1.001, x));
    y = Math.max(0, Math.min(height - 1.001, y));
    z = Math.max(0, Math.min(depth - 1.001, z));

    // Get the integer and fractional parts of the coordinates
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const z0 = Math.floor(z);
    
    const x1 = x0 + 1;
    const y1 = y0 + 1;
    const z1 = z0 + 1;

    const fx = x - x0;
    const fy = y - y0;
    const fz = z - z0;

    // Get the voxel values at the 8 corners of the interpolation cube
    const getValue = (xi, yi, zi) => {
        // Ensure corner coordinates are within bounds
        const x_ = Math.min(xi, width - 1);
        const y_ = Math.min(yi, height - 1);
        const z_ = Math.min(zi, depth - 1);
        const index = z_ * width * height + y_ * width + x_;
        return this.volume[index] || 0;
    };

    const v000 = getValue(x0, y0, z0);
    const v100 = getValue(x1, y0, z0);
    const v010 = getValue(x0, y1, z0);
    const v110 = getValue(x1, y1, z0);
    const v001 = getValue(x0, y0, z1);
    const v101 = getValue(x1, y0, z1);
    const v011 = getValue(x0, y1, z1);
    const v111 = getValue(x1, y1, z1);

    // Perform the interpolation
    const v00 = v000 * (1 - fx) + v100 * fx;
    const v01 = v001 * (1 - fx) + v101 * fx;
    const v10 = v010 * (1 - fx) + v110 * fx;
    const v11 = v011 * (1 - fx) + v111 * fx;
    const v0 = v00 * (1 - fy) + v10 * fy;
    const v1 = v01 * (1 - fy) + v11 * fy;

    return v0 * (1 - fz) + v1 * fz;
}

  // Generate professional MPR slice
  generateMPRSlice(orientation, position) {
    if (!this.volume || !this.volumeData) {
      console.error("No volume data available for MPR slice generation");
      return null;
    }

    const { width, height, depth } = this.dimensions;
    const validPosition = Math.max(0, Math.min(1, parseFloat(position)));

    console.log(
      `Generating professional ${orientation} MPR slice at position ${validPosition}`
    );

    let sliceData, sliceWidth, sliceHeight, sliceIndex;

    try {
      switch (orientation) {
        case "axial":
          // For axial, use original images when possible
          sliceIndex = Math.round(validPosition * (depth - 1));
          if (sliceIndex < this.images.length) {
            const originalImage = this.images[sliceIndex];
            this.fixPixelValueRange(originalImage);
            return {
              image: originalImage,
              width: width,
              height: height,
              sliceIndex: sliceIndex,
              orientation: orientation,
              position: validPosition,
            };
          }
          break;

        case "sagittal":
          sliceWidth = depth;
          sliceHeight = height;
          sliceIndex = Math.round(validPosition * (width - 1));
          sliceData = this.extractSagittalSliceData(sliceIndex);
          break;

        case "coronal":
          sliceWidth = width;
          sliceHeight = depth;
          sliceIndex = Math.round(validPosition * (height - 1));
          sliceData = this.extractCoronalSliceData(sliceIndex);
          break;

        default:
          console.error(`Unknown orientation: ${orientation}`);
          return null;
      }

      if (sliceData) {
        const imageResult = this.createImageFromSliceData(
          sliceData,
          sliceWidth,
          sliceHeight,
          orientation,
          validPosition,
          sliceIndex
        );

        if (imageResult && this.validateSliceData(sliceData, orientation)) {
          return imageResult;
        } else {
          console.warn(
            `Invalid slice data for ${orientation} at position ${validPosition}`
          );
          return null;
        }
      }
    } catch (error) {
      console.error(`Error generating ${orientation} slice:`, error);
      return null;
    }

    return null;
  }

  // Extract sagittal slice with proper orientation
  extractSagittalSliceData(xIndex) {
    const { width, height, depth } = this.dimensions;
    const sliceData = new Float32Array(height * depth);

    // Extract sagittal plane (YZ plane at X = xIndex)
    for (let z = 0; z < depth; z++) {
      for (let y = 0; y < height; y++) {
        const volumeIndex = z * width * height + y * width + xIndex;
        const sliceDataIndex = (depth - 1 - z) * height + y; // Flip Z for proper orientation
        sliceData[sliceDataIndex] = this.volume[volumeIndex] || 0;
      }
    }

    console.log(
      `Extracted sagittal slice at X=${xIndex}, size: ${height}x${depth}`
    );
    return sliceData;
  }

  // Extract coronal slice with proper orientation
  extractCoronalSliceData(yIndex) {
    const { width, height, depth } = this.dimensions;
    const sliceData = new Float32Array(width * depth);

    // Extract coronal plane (XZ plane at Y = yIndex)
    for (let z = 0; z < depth; z++) {
      for (let x = 0; x < width; x++) {
        const volumeIndex = z * width * height + yIndex * width + x;
        const sliceDataIndex = (depth - 1 - z) * width + x; // Flip Z for proper orientation
        sliceData[sliceDataIndex] = this.volume[volumeIndex] || 0;
      }
    }

    console.log(
      `Extracted coronal slice at Y=${yIndex}, size: ${width}x${depth}`
    );
    return sliceData;
  }

  // Create Cornerstone-compatible image from slice data
  createImageFromSliceData(
    sliceData,
    width,
    height,
    orientation,
    position,
    sliceIndex
  ) {
    // Convert to Uint16Array for Cornerstone compatibility
    const uint16Data = new Uint16Array(sliceData.length);
    let min = Number.MAX_VALUE;
    let max = Number.MIN_VALUE;

    for (let i = 0; i < sliceData.length; i++) {
      const value = sliceData[i];
      // Shift negative values for Uint16 representation
      const shiftedValue = value + 32768;
      uint16Data[i] = Math.max(0, Math.min(65535, shiftedValue));

      if (value < min) min = value;
      if (value > max) max = value;
    }

    // Create professional image object
    const image = {
      imageId: `mpr-${orientation}-${position.toFixed(3)}-professional`,
      minPixelValue: min,
      maxPixelValue: max,
      slope: 1,
      intercept: -32768, // Compensate for the shift
      windowCenter: this.globalWindowCenter,
      windowWidth: this.globalWindowWidth,
      render: cornerstone.renderGrayscaleImage,
      getPixelData: () => uint16Data,
      rows: height,
      columns: width,
      height: height,
      width: width,
      color: false,
      columnPixelSpacing: this.spacing.x,
      rowPixelSpacing: this.spacing.y,
      sizeInBytes: uint16Data.byteLength,
      photometricInterpretation: "MONOCHROME2",
    };

    console.log(
      `Created professional ${orientation} image: ${width}x${height}, W/L: ${image.windowWidth}/${image.windowCenter}`
    );

    return {
      image: image,
      width: width,
      height: height,
      sliceIndex: sliceIndex,
      orientation: orientation,
      position: position,
      pixelSpacing: this.spacing,
      windowWidth: image.windowWidth,
      windowCenter: image.windowCenter,
    };
  }

  // Validate slice data quality
  validateSliceData(sliceData, orientation) {
    const nonZeroPixels = Array.from(sliceData).filter((p) => p !== 0).length;
    const totalPixels = sliceData.length;
    const fillRatio = nonZeroPixels / totalPixels;

    console.log(
      `${orientation} slice validation: ${nonZeroPixels}/${totalPixels} pixels (${(
        fillRatio * 100
      ).toFixed(1)}% filled)`
    );

    if (fillRatio < 0.05) {
      console.warn(
        `${orientation} slice appears mostly empty - check reconstruction algorithm`
      );
      return false;
    }

    return true;
  }

  // Get volume information
  getVolumeInfo() {
    return {
      dimensions: this.dimensions,
      spacing: this.spacing,
      origin: this.origin,
      imageCount: this.images.length,
      hasVolumeData: !!this.volumeData,
      globalWindowWidth: this.globalWindowWidth,
      globalWindowCenter: this.globalWindowCenter,
      interpolationMethod: this.interpolationMethod,
    };
  }

  // Get slice count for UI
  getSliceCount() {
    return this.dimensions.depth || this.images.length;
  }

  // Extract slice data (wrapper method for compatibility)
  extractSlice(orientation, position) {
    if (!this.volumeData) {
      console.warn("No volume data available for slice extraction");
      return null;
    }

    return this.generateMPRSlice(orientation, position);
  }

  // Advanced validation with geometric tests
  validateMPRGeometry() {
    if (!this.volumeData || !this.transformMatrix) {
      return { valid: false, reason: "No volume data or transform matrix" };
    }

    try {
      // Test coordinate transformation accuracy
      const testPoints = [
        [0, 0, 0],
        [this.dimensions.width - 1, 0, 0],
        [0, this.dimensions.height - 1, 0],
        [0, 0, this.dimensions.depth - 1],
      ];

      for (const point of testPoints) {
        const transformed = this.transformPoint(point);
        const backTransformed = this.inverseTransformPoint(transformed);

        const error = Math.sqrt(
          Math.pow(point[0] - backTransformed[0], 2) +
            Math.pow(point[1] - backTransformed[1], 2) +
            Math.pow(point[2] - backTransformed[2], 2)
        );

        if (error > 0.1) {
          return {
            valid: false,
            reason: `Transform accuracy error: ${error.toFixed(
              3
            )}mm > 0.1mm threshold`,
            error: error,
          };
        }
      }

      return { valid: true, message: "MPR geometry validation passed" };
    } catch (error) {
      return { valid: false, reason: `Validation error: ${error.message}` };
    }
  }

  // Transform point using transformation matrix
  transformPoint(point) {
    const [x, y, z] = point;
    const m = this.transformMatrix;

    return [
      m[0] * x + m[4] * y + m[8] * z + m[12],
      m[1] * x + m[5] * y + m[9] * z + m[13],
      m[2] * x + m[6] * y + m[10] * z + m[14],
    ];
  }

  // Inverse transform point
  inverseTransformPoint(point) {
    const [x, y, z] = point;
    const m = this.inverseTransformMatrix;

    return [
      m[0] * x + m[4] * y + m[8] * z + m[12],
      m[1] * x + m[5] * y + m[9] * z + m[13],
      m[2] * x + m[6] * y + m[10] * z + m[14],
    ];
  }

  // Professional MPR slice generation with enhanced error handling
// Professional MPR slice generation with enhanced error handling and BUG FIX for axial view
generateProfessionalMPRSlice(orientation, position) {
    const startTime = performance.now();

    if (!this.volume || !this.volumeData) {
        console.error("No volume data available for professional MPR slice generation");
        return null;
    }

    const { width, height, depth } = this.dimensions;
    const validPosition = Math.max(0, Math.min(1, parseFloat(position)));

    console.log(`Generating PROFESSIONAL ${orientation} MPR slice at position ${validPosition}`);

    try {
        let sliceData, sliceWidth, sliceHeight, sliceIndex;

        switch (orientation) {
            case "axial":
                sliceIndex = Math.round(validPosition * (depth - 1));
                if (sliceIndex < this.images.length) {
                    // *** FIX IS HERE: Access the .image property from the stored object ***
                    const originalImage = this.images[sliceIndex].image; 
                    
                    this.fixPixelValueRange(originalImage);

                    const result = {
                        image: originalImage,
                        width: width,
                        height: height,
                        sliceIndex: sliceIndex,
                        orientation: orientation,
                        position: validPosition,
                        processingTime: performance.now() - startTime,
                        source: "original",
                    };
                    console.log(`Professional axial slice generated in ${result.processingTime.toFixed(2)}ms`);
                    return result;
                }
                break;

            case "sagittal":
                sliceWidth = depth;
                sliceHeight = height;
                sliceIndex = Math.round(validPosition * (width - 1));
                sliceData = this.extractProfessionalSagittalSlice(sliceIndex);
                if (sliceData) this.debugSliceData(sliceData, orientation);
                break;

            case "coronal":
                sliceWidth = width;
                sliceHeight = depth;
                sliceIndex = Math.round(validPosition * (height - 1));
                sliceData = this.extractProfessionalCoronalSlice(sliceIndex);
                if (sliceData) this.debugSliceData(sliceData, orientation);
                break;

            default:
                console.error(`Unknown orientation: ${orientation}`);
                return null;
        }

        if (sliceData) {
            if (!this.validateSliceData(sliceData, orientation)) {
                console.warn(`Professional MPR validation failed for ${orientation} slice`);
                return null;
            }

            const imageResult = this.createProfessionalImageFromSliceData(
                sliceData,
                sliceWidth,
                sliceHeight,
                orientation,
                validPosition,
                sliceIndex
            );

            if (imageResult) {
                imageResult.processingTime = performance.now() - startTime;
                imageResult.source = "reconstructed";
                console.log(`Professional ${orientation} slice generated in ${imageResult.processingTime.toFixed(2)}ms`);
                return imageResult;
            }
        }
    } catch (error) {
        console.error(`Error generating professional ${orientation} slice:`, error);
        return this.generateFallbackSlice(orientation, validPosition);
    }

    return null;
}

  // COMPLETELY FIXED: Sagittal slice extraction
// CORRECTED: Extract sagittal slice (YZ plane at X position)
// CORRECTED: Extract sagittal slice using trilinear interpolation for high quality
extractProfessionalSagittalSlice(xIndex) {
    const { width, height, depth } = this.dimensions;
    const sliceData = new Float32Array(height * depth);
    const sliceWidth = depth;  // Sagittal view width is the volume's depth
    const sliceHeight = height; // Sagittal view height is the volume's height

    for (let j = 0; j < sliceHeight; j++) { // Iterating through the Y-axis of the volume
        for (let i = 0; i < sliceWidth; i++) { // Iterating through the Z-axis of the volume
            // Map the 2D slice coordinates back to 3D volume coordinates
            const x = xIndex;
            const y = j;
            const z = i; // Z-coordinate in volume corresponds to X-axis of the slice

            // Sample the volume at this 3D point using interpolation
            const value = this.sampleVolumeTrilinear(x, y, z);
            
            // Map to the slice, flipping the X-axis (volume depth) for correct anatomical view
            const sliceIndex = j * sliceWidth + (sliceWidth - 1 - i);
            sliceData[sliceIndex] = value;
        }
    }
    
    return sliceData;
}

// CORRECTED: Extract coronal slice using trilinear interpolation for high quality
extractProfessionalCoronalSlice(yIndex) {
    const { width, height, depth } = this.dimensions;
    const sliceData = new Float32Array(width * depth);
    const sliceWidth = width;   // Coronal view width is the volume's width
    const sliceHeight = depth;  // Coronal view height is the volume's depth

    for (let j = 0; j < sliceHeight; j++) { // Iterating through the Z-axis of the volume
        for (let i = 0; i < sliceWidth; i++) { // Iterating through the X-axis of the volume
            // Map the 2D slice coordinates back to 3D volume coordinates
            const x = i;
            const y = yIndex;
            const z = j; // Z-coordinate in volume corresponds to Y-axis of the slice

            // Sample the volume at this 3D point using interpolation
            const value = this.sampleVolumeTrilinear(x, y, z);

            // Map to the slice, flipping the Y-axis (volume depth) for correct anatomical view
            const sliceIndex = (sliceHeight - 1 - j) * sliceWidth + i;
            sliceData[sliceIndex] = value;
        }
    }

    return sliceData;
}

  // Calculate slice statistics for validation
  calculateSliceStatistics(sliceData) {
    let min = Number.MAX_VALUE;
    let max = Number.MIN_VALUE;
    let sum = 0;
    let nonZeroCount = 0;

    for (let i = 0; i < sliceData.length; i++) {
      const value = sliceData[i];
      if (value !== 0) nonZeroCount++;
      if (value < min) min = value;
      if (value > max) max = value;
      sum += value;
    }

    return {
      min: min === Number.MAX_VALUE ? 0 : min,
      max: max === Number.MIN_VALUE ? 0 : max,
      mean: sliceData.length > 0 ? sum / sliceData.length : 0,
      nonZeroCount: nonZeroCount,
      fillRatio: sliceData.length > 0 ? nonZeroCount / sliceData.length : 0,
    };
  }

  // Generate interpolated slice as fallback
  generateInterpolatedSlice(orientation, sliceIndex) {
    console.log(
      `Generating interpolated ${orientation} slice at index ${sliceIndex}`
    );

    // This is a simplified fallback - in production, you'd use proper trilinear interpolation
    // For now, return null to indicate interpolation is not available
    console.warn(
      "Interpolated slice generation not yet implemented - using direct extraction"
    );
    return null;
  }

// IMPROVED: Create image with better pixel value handling
// IMPROVED: Create image with better pixel value handling and CORRECT pixel spacing
createProfessionalImageFromSliceData(sliceData, width, height, orientation, position, sliceIndex) {
    try {
        console.log(`Creating image for ${orientation}: ${width}x${height}`);
        
        // Calculate statistics from the slice data
        let min = Number.MAX_VALUE;
        let max = Number.MIN_VALUE;
        let sum = 0;
        let nonZeroCount = 0;
        
        for (let i = 0; i < sliceData.length; i++) {
            const value = sliceData[i];
            if (value !== 0) {
                nonZeroCount++;
                if (value < min) min = value;
                if (value > max) max = value;
                sum += value;
            }
        }
        
        if (nonZeroCount === 0) {
            console.error(`Empty ${orientation} slice - all zeros`);
            return null;
        }
        
        const mean = sum / nonZeroCount;
        console.log(`Slice stats: min=${min.toFixed(1)}, max=${max.toFixed(1)}, mean=${mean.toFixed(1)}, fill=${(nonZeroCount/sliceData.length*100).toFixed(1)}%`);
        
        // Create Uint16Array with proper rescaling
        const uint16Data = new Uint16Array(sliceData.length);
        
        // Rescale to 16-bit range preserving contrast
        const range = max - min;
        const scale = range > 0 ? 65535 / range : 1;
        
        for (let i = 0; i < sliceData.length; i++) {
            const value = sliceData[i];
            if (value === 0) {
                uint16Data[i] = 0;
            } else {
                // Rescale to 0-65535 range
                const scaled = (value - min) * scale;
                uint16Data[i] = Math.max(0, Math.min(65535, Math.round(scaled)));
            }
        }
        
        // Calculate appropriate window/level for this slice
        const windowCenter = mean;
        const windowWidth = range * 0.8; // Use 80% of range for windowing
        
        // *** FIX STARTS HERE: Correctly assign pixel spacing for each orientation ***
        let columnPixelSpacing, rowPixelSpacing;
        if (orientation === 'sagittal') {
            // Sagittal view is (depth x height), so spacing is (slice_spacing x row_spacing)
            columnPixelSpacing = this.spacing.z;
            rowPixelSpacing = this.spacing.y;
        } else if (orientation === 'coronal') {
            // Coronal view is (width x depth), so spacing is (column_spacing x slice_spacing)
            columnPixelSpacing = this.spacing.x;
            rowPixelSpacing = this.spacing.z;
        } else { // Axial
            columnPixelSpacing = this.spacing.x;
            rowPixelSpacing = this.spacing.y;
        }
        // *** FIX ENDS HERE ***

        // Create Cornerstone image object
        const image = {
            imageId: `mpr-${orientation}-${position.toFixed(3)}`,
            minPixelValue: 0,
            maxPixelValue: 65535,
            slope: range / 65535,
            intercept: min,
            windowCenter: windowCenter || this.globalWindowCenter,
            windowWidth: Math.max(windowWidth || this.globalWindowWidth, 1),
            render: cornerstone.renderGrayscaleImage,
            getPixelData: () => uint16Data,
            rows: height,
            columns: width,
            height: height,
            width: width,
            color: false,
            // Use the corrected pixel spacing variables
            columnPixelSpacing: columnPixelSpacing,
            rowPixelSpacing: rowPixelSpacing,
            sizeInBytes: uint16Data.byteLength,
            photometricInterpretation: 'MONOCHROME2'
        };
        
        console.log(`${orientation} image created: W/L=${image.windowWidth.toFixed(0)}/${image.windowCenter.toFixed(0)}`);
        
        return {
            image: image,
            width: width,
            height: height,
            sliceIndex: sliceIndex,
            orientation: orientation,
            position: position,
            qualityScore: nonZeroCount / sliceData.length,
            statistics: { min, max, mean, nonZeroCount }
        };
        
    } catch (error) {
        console.error(`Error creating image for ${orientation}:`, error);
        return null;
    }
}

// Add this method to MPRManager class for debugging
validateVolumeIntegrity() {
    const { width, height, depth } = this.dimensions;
    console.log('=== VOLUME INTEGRITY CHECK ===');
    
    // Check each axis has data
    let axialNonZero = 0, sagittalNonZero = 0, coronalNonZero = 0;
    
    // Sample middle slice from each orientation
    const midX = Math.floor(width / 2);
    const midY = Math.floor(height / 2);
    const midZ = Math.floor(depth / 2);
    
    // Check axial slice (XY plane at Z=midZ)
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = midZ * height * width + y * width + x;
            if (this.volume[idx] !== 0) axialNonZero++;
        }
    }
    
    // Check sagittal slice (YZ plane at X=midX)
    for (let z = 0; z < depth; z++) {
        for (let y = 0; y < height; y++) {
            const idx = z * height * width + y * width + midX;
            if (this.volume[idx] !== 0) sagittalNonZero++;
        }
    }
    
    // Check coronal slice (XZ plane at Y=midY)
    for (let z = 0; z < depth; z++) {
        for (let x = 0; x < width; x++) {
            const idx = z * height * width + midY * width + x;
            if (this.volume[idx] !== 0) coronalNonZero++;
        }
    }
    
    console.log(`Axial mid-slice: ${axialNonZero}/${width*height} non-zero`);
    console.log(`Sagittal mid-slice: ${sagittalNonZero}/${height*depth} non-zero`);
    console.log(`Coronal mid-slice: ${coronalNonZero}/${width*depth} non-zero`);
    
    return {
        axial: axialNonZero > 0,
        sagittal: sagittalNonZero > 0,
        coronal: coronalNonZero > 0
    };
}

  // Fallback slice generation for error recovery
  generateFallbackSlice(orientation, position) {
    console.log(
      `Generating fallback slice for ${orientation} at position ${position}`
    );

    const { width, height, depth } = this.dimensions;

    try {
      // Create a simple test pattern to verify the viewport works
      let sliceWidth, sliceHeight;

      switch (orientation) {
        case "sagittal":
          sliceWidth = depth;
          sliceHeight = height;
          break;
        case "coronal":
          sliceWidth = width;
          sliceHeight = depth;
          break;
        default:
          sliceWidth = width;
          sliceHeight = height;
      }

      // Create a test pattern
      const testData = new Uint16Array(sliceWidth * sliceHeight);
      for (let i = 0; i < testData.length; i++) {
        // Create a checkerboard pattern
        const x = i % sliceWidth;
        const y = Math.floor(i / sliceWidth);
        testData[i] = ((x + y) % 2) * 30000 + 5000;
      }

      const image = {
        imageId: `fallback-${orientation}-${position}`,
        minPixelValue: 5000,
        maxPixelValue: 35000,
        slope: 1,
        intercept: 0,
        windowCenter: 20000,
        windowWidth: 30000,
        render: cornerstone.renderGrayscaleImage,
        getPixelData: () => testData,
        rows: sliceHeight,
        columns: sliceWidth,
        height: sliceHeight,
        width: sliceWidth,
        color: false,
        columnPixelSpacing: this.spacing.x,
        rowPixelSpacing: this.spacing.y,
        sizeInBytes: testData.byteLength,
        photometricInterpretation: "MONOCHROME2",
      };

      return {
        image: image,
        width: sliceWidth,
        height: sliceHeight,
        sliceIndex: Math.round(position * (depth - 1)),
        orientation: orientation,
        position: position,
        pixelSpacing: this.spacing,
        windowWidth: image.windowWidth,
        windowCenter: image.windowCenter,
        isFallback: true,
      };
    } catch (error) {
      console.error(`Fallback slice generation failed:`, error);
      return null;
    }
  }

  // Comprehensive MPR system test
  runDiagnostics() {
    console.log("=== PROFESSIONAL MPR DIAGNOSTICS ===");

    const diagnostics = {
      timestamp: new Date().toISOString(),
      volumeStatus: !!this.volumeData,
      dimensions: this.dimensions,
      spacing: this.spacing,
      imageCount: this.images.length,
      volumeSize: this.volume ? this.volume.length : 0,
      transformMatrix: !!this.transformMatrix,
      inverseTransformMatrix: !!this.inverseTransformMatrix,
    };

    if (this.volumeData) {
      // Test volume data integrity
      const volumeStats = this.calculateSliceStatistics(this.volume);
      diagnostics.volumeStats = volumeStats;

      // Test coordinate transformations
      const geometryValidation = this.validateMPRGeometry();
      diagnostics.geometryValidation = geometryValidation;

      // Test slice generation
      const testResults = {};
      ["axial", "sagittal", "coronal"].forEach((orientation) => {
        try {
          const testSlice = this.generateProfessionalMPRSlice(orientation, 0.5);
          testResults[orientation] = {
            success: !!testSlice,
            processingTime: testSlice ? testSlice.processingTime : null,
            qualityScore: testSlice ? testSlice.qualityScore : null,
          };
        } catch (error) {
          testResults[orientation] = {
            success: false,
            error: error.message,
          };
        }
      });

      diagnostics.sliceTests = testResults;
    }

    console.log("Professional MPR Diagnostics:", diagnostics);
    return diagnostics;
  }

  // Cleanup resources
  dispose() {
    console.log("Disposing professional MPR manager resources");

    this.volumeData = null;
    this.images = [];
    this.volume = null;
    this.transformMatrix = null;
    this.inverseTransformMatrix = null;
    this.volumeMetadata = {};

    console.log("Professional MPR manager disposed");
  }
};
