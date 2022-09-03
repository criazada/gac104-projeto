function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if (success) {
        return shader;
    } else {
        console.log(gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
    }
}

function createShaderFromScript(gl, id) {
    let source = '';
    let type;
    const element = document.getElementById(id);
    if (element.type == "x-shader/x-vertex") {
        type = gl.VERTEX_SHADER;
    } else if (element.type == "x-shader/x-fragment") {
        type = gl.FRAGMENT_SHADER;
    }
    source = element.textContent;

    return createShader(gl, type, source);
}

function createProgram(gl, vertexShader, fragShader) {
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragShader);
    gl.linkProgram(program);

    const success = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (success) {
        return program;
    } else {
        console.log(gl.getProgramInfoLog(program));
        gl.deleteProgram(program);
    }
}

function resizeCanvas(canvas) {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    if (width != canvas.width || height != canvas.height) {
        canvas.width = width;
        canvas.height = height;
        return true;
    } else {
        return false;
    }
}

function updateBuffer(/** @type {WebGLRenderingContext} */ gl, buffer, value) {
    if (value !== undefined) {
        let val;
        if (buffer.type == gl.FLOAT) {
            val = new Float32Array(value);
        } else if (buffer.type == gl.UNSIGNED_SHORT) {
            val = new Uint16Array(value);
        }
        if (val !== undefined) {
            gl.bindBuffer(buffer.mode, buffer.glBuffer);
            gl.bufferData(buffer.mode, val, buffer.usage || gl.STATIC_DRAW);
        }
    }
}

function createBuffers(/** @type {WebGLRenderingContext} */ gl, program, buffers) {
    var newobj = {};
    for (const bufName in buffers) {
        const obj = buffers[bufName];
        const mode = obj.mode || gl.ARRAY_BUFFER;
        let location;
        if (mode === gl.ARRAY_BUFFER) {
            location = gl.getAttribLocation(program, bufName);
        }
        const glBuffer = gl.createBuffer();
        newobj[bufName] = {
            location,
            glBuffer,
            mode,
            type: obj.type,
            size: obj.size,
            usage: obj.usage
        };
        updateBuffer(gl, newobj[bufName], obj.value);
    }

    return newobj;
}

function useAttribArray(/** @type {WebGLRenderingContext} */ gl, buffer) {
    gl.enableVertexAttribArray(buffer.location);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer.glBuffer);
    gl.vertexAttribPointer(buffer.location, buffer.size, buffer.type, false, 0, 0);
}

function parseObj(text) {
    var positions = [[0, 0, 0]];
    var texcoords = [[0, 0]];
    var normals = [[0, 0, 0]];
    var objVertexData = [ positions, texcoords, normals ];
    var webglVertexData = [ [], [], [] ];

    text.split("\n").forEach(line => {
        if (line === '' || line.startsWith('#')) return;
        const m = /(\w*)(?: )*(.*)/.exec(line);
        if (!m) return;

        const [, keyword, argsText] = m;
        const parts = line.split(/\s+/).slice(1);

        if (keyword === "v") {
            positions.push(parts.map(parseFloat));
        } else if (keyword === "vn") {
            normals.push(parts.map(parseFloat));
        } else if (keyword === "vt") {
            texcoords.push(parts.map(parseFloat));
        } else if (keyword === "f") {
            function addVertex(vert) {
                const pos_tex_norm = vert.split('/');
                pos_tex_norm.forEach((objIndexS, i) => {
                    if (!objIndexS) return;
                    const objIndex = parseInt(objIndexS);
                    const index = objIndex + (objIndex >= 0 ? 0 : objVertexData[i].length);
                    webglVertexData[i].push(...objVertexData[i][index]);
                });
            }

            const nTriangles = parts.length - 2;
            for (let tri = 0; tri < nTriangles; tri++) {
                addVertex(parts[0]);
                addVertex(parts[tri + 1]);
                addVertex(parts[tri + 2]);
            }
        } else {
            console.log(keyword);
        }
    });
    return {
        position: webglVertexData[0],
        texcoord: webglVertexData[1],
        normal: webglVertexData[2],
    };
}
