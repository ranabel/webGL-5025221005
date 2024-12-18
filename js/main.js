async function main() {
  // Get A WebGL context
  const canvas = document.querySelector("canvas");
  const gl = canvas.getContext("webgl");

  if (!gl) return;

  createHandler(canvas);
  
  // Shader program setup
  const meshProgramInfo = webglUtils.createProgramInfo(gl, [vs, fs]);

  // Load and parse OBJ file
  const response = await fetch("data/data.obj");
  const text = await response.text();
  const obj = parseOBJ(text);

  // Load and parse MTL file
  const mtlResponse = await fetch("data/data.mtl");
  const mtlText = await mtlResponse.text();
  const materials = await parseMTL(mtlText);

  const materialLib = {};
  for (const [name, material] of Object.entries(materials)) {
    materialLib[name] = {
      u_diffuse: material.diffuse
        ? [...material.diffuse, 1] // Add alpha = 1
        : [1, 1, 1, 1], // Default white
    };
  }
  // Prepare geometries and buffers
  const parts = obj.geometries.map(({ material, data }) => {
    if (!data.color) {
      data.color = { value: [1, 1, 1, 1] };
    }
    return {
      material: materialLib[material] || { u_diffuse: [1, 1, 1, 1] },
      bufferInfo: webglUtils.createBufferInfoFromArrays(gl, data),
    };
  });

  // Load textures asynchronously
  const textures = {
    label: await createTexture(gl, "/data/set4.png"),
    defaultWhite: create1PixelTexture(gl, [255, 255, 255, 255]),
  };

  // Apply textures to materials
  for (const material of Object.values(materials)) {
    Object.entries(material)
      .filter(([key]) => key.endsWith("Map"))
      .forEach(([key, filename]) => {
        let texture = textures[filename];
        if (!texture) {
          texture = textures.label; 
          textures[filename] = texture;
        }
        material[key] = texture;
      });
  }
  
  // Set up camera and scene
  const extents = getGeometriesExtents(obj.geometries);
  const range = m4.subtractVectors(extents.max, extents.min);
  const objOffset = m4.scaleVector(
    m4.addVectors(extents.min, m4.scaleVector(range, 0.5)),
    -1
  );
  const cameraTarget = [0, 0, 0];
  const radius = m4.length(range) * 1.2;
  const zNear = radius / 100;
  const zFar = radius * 3;

  function render(time) {
    time *= 0.001; // Convert to seconds

    webglUtils.resizeCanvasToDisplaySize(gl.canvas);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.enable(gl.DEPTH_TEST);

    const fieldOfViewRadians = Math.PI / 3;
    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    const projection = m4.perspective(fieldOfViewRadians, aspect, zNear, zFar);

    const radiusWithZoom = radius * zoom;
    const camera = m4.lookAt([0, 0, radiusWithZoom], cameraTarget, [0, 1, 0]);
    const view = m4.inverse(camera);

    const sharedUniforms = {
      u_lightDirection: m4.normalize([-1, 3, 5]),
      u_view: view,
      u_projection: projection,
    };

    gl.useProgram(meshProgramInfo.program);
    webglUtils.setUniforms(meshProgramInfo, sharedUniforms);
    
    rotation.y += 0.01; // Rotate around the y-axis
    let u_world = m4.identity();
    u_world = m4.translate(u_world, ...objOffset);
    u_world = m4.yRotate(u_world, rotation.y);
    u_world = m4.xRotate(u_world, rotation.x);

    for (const { bufferInfo, material } of parts) {
      webglUtils.setBuffersAndAttributes(gl, meshProgramInfo, bufferInfo);
      webglUtils.setUniforms(meshProgramInfo, {
        u_world,
        u_diffuse: material.u_diffuse,
      });
      webglUtils.drawBufferInfo(gl, bufferInfo);
    }

    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
}

main();