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

let s = {};

function webglMain() {

    const canvas = document.getElementById("webgl");
    /** @type {WebGLRenderingContext} */
    const gl = canvas.getContext("webgl");
    s.gl = gl;
    if (!gl) {
        console.error("WebGL não suportado");
    }

    gl.enable(gl.CULL_FACE);
    gl.enable(gl.DEPTH_TEST);

    const vertexShader = createShaderFromScript(gl, "cubo-vert");
    const fragShader = createShaderFromScript(gl, "cubo-frag");

    const program = createProgram(gl, vertexShader, fragShader);
    s.program = program;

    s.u_matrix = gl.getUniformLocation(program, "u_matrix");

    s.buffers = createBuffers(gl, program, {
        a_position: {
            type: gl.FLOAT,
            size: 3,
            value: [
                -1.0, -1.0,  1.0,
                1.0, -1.0,  1.0,
                1.0,  1.0,  1.0,
               -1.0,  1.0,  1.0,

               -1.0, -1.0, -1.0,
                1.0, -1.0, -1.0,
                1.0,  1.0, -1.0,
               -1.0,  1.0, -1.0
            ]
        },
        a_color: {
            type: gl.FLOAT,
            size: 3,
            value: [
                1.0, 0.0, 0.0,
                0.0, 1.0, 0.0,
                0.0, 0.0, 1.0,
                0.0, 1.0, 1.0,
                1.0, 0.0, 1.0,
                1.0, 1.0, 0.0,
                1.0, 1.0, 1.0,
                0.0, 0.0, 0.0,
            ]
        },
        indices: {
            type: gl.UNSIGNED_SHORT,
            mode: gl.ELEMENT_ARRAY_BUFFER,
            value: [
                // back
                0, 1, 2,
                2, 3, 0,
                // right
                1, 5, 6,
                6, 2, 1,
                // back
                7, 6, 5,
                5, 4, 7,
                // left
                4, 0, 3,
                3, 7, 4,
                // bottom
                4, 5, 1,
                1, 0, 4,
                // top
                3, 2, 6,
                6, 7, 3
            ]
        }
    });

    requestAnimationFrame(drawFrame);
}

function drawFrame(time) {
    time *= 0.0005;
    const m4 = glMatrix.mat4;
    const v3 = glMatrix.vec3;

    /** @type {WebGLRenderingContext} */
    const gl = s.gl;

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    resizeCanvas(gl.canvas);

    const perspective = m4.create();
    m4.perspective(perspective, 90, gl.canvas.width / gl.canvas.height, 0.01, 1000);
    m4.translate(perspective, perspective, v3.fromValues(0, 0, -3));
    m4.rotate(perspective, perspective, time, v3.fromValues(1, 1, 0));

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    const program = s.program;
    const buffers = s.buffers;
    const u_matrix = s.u_matrix;

    gl.useProgram(program);

    gl.uniformMatrix4fv(u_matrix, false, perspective);
    useAttribArray(gl, buffers.a_position);
    useAttribArray(gl, buffers.a_color);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.indices.glBuffer);
    gl.drawElements(gl.TRIANGLES, 36, gl.UNSIGNED_SHORT, 0);

    requestAnimationFrame(drawFrame);
}

window.addEventListener('load', () => {
    webglMain();
});
