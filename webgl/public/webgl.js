let s = {};

async function loadObjUrl(url) {
    const resp = await fetch(url);
    return parseObj(await resp.text());
}

async function webglMain() {
    const canvas = document.getElementById("webgl");
    /** @type {WebGLRenderingContext} */
    const gl = canvas.getContext("webgl");
    s.gl = gl;
    if (!gl) {
        console.error("WebGL não suportado");
    }

    const vertexShader = createShaderFromScript(gl, "cubo-vert");
    const fragShader = createShaderFromScript(gl, "cubo-frag");

    const program = createProgram(gl, vertexShader, fragShader);

    const u_vp = gl.getUniformLocation(program, "u_viewProjection");
    const u_world = gl.getUniformLocation(program, "u_world");
    const u_wit = gl.getUniformLocation(program, "u_worldInverseTranspose");
    const u_color = gl.getUniformLocation(program, "u_color");

    const u_lightPos = gl.getUniformLocation(program, "u_lightPos");
    const u_lightColor = gl.getUniformLocation(program, "u_lightColor");
    const u_viewPos = gl.getUniformLocation(program, "u_viewPos");
    const u_ambient = gl.getUniformLocation(program, "u_ambient");
    const u_specularStrength = gl.getUniformLocation(program, "u_specularStrength");
    const u_shininess = gl.getUniformLocation(program, "u_shininess");

    const o_peca = await loadObjUrl(`obj/peca.obj`);

    const b_peca = createBuffers(gl, program, {
        a_position: {
            type: gl.FLOAT,
            size: 3,
            value: o_peca.position
        },
        a_normal: {
            type: gl.FLOAT,
            size: 3,
            value: o_peca.normal
        },
    });

    const faces = ["u", "d", "r", "l", "f", "b"];
    const objFaces = [];
    const bufFaces = [];
    for (const f of faces) {
        const obj = await loadObjUrl(`obj/face_${f}.obj`);
        objFaces.push(obj);
        bufFaces.push(createBuffers(gl, program, {
            a_position: {
                type: gl.FLOAT,
                size: 3,
                value: obj.position
            },
            a_normal: {
                type: gl.FLOAT,
                size: 3,
                value: obj.normal
            }
        }));
    }

    function drawFrame(time) {
        time *= 0.0005;
        const m4 = glMatrix.mat4;
        const v3 = glMatrix.vec3;
    
        /** @type {WebGLRenderingContext} */
        const gl = s.gl;
    
        gl.disable(gl.CULL_FACE);
        gl.enable(gl.DEPTH_TEST);
    
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        resizeCanvas(gl.canvas);
    
        const projection = m4.create();
        m4.perspective(projection, Math.PI/2, gl.canvas.width / gl.canvas.height, 0.01, 1000);
    
        const view = m4.create();
        const camPos = v3.fromValues(0, 5, 10);
        m4.translate(view, view, camPos);
        m4.rotate(view, view, -Math.PI/6, v3.fromValues(1, 0, 0));
        m4.invert(view, view);
    
        const viewProjection = m4.create();
        m4.multiply(viewProjection, projection, view);
        
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        
        gl.useProgram(program);
        gl.uniformMatrix4fv(u_vp, false, viewProjection);

        gl.uniform3fv(u_lightPos, [3, 3, 3]);
        gl.uniform3fv(u_lightColor, [1, 1, 1]);
        gl.uniform3fv(u_viewPos, camPos);
        gl.uniform1f(u_ambient, 0.1);
        gl.uniform1f(u_specularStrength, 0.5);
        gl.uniform1f(u_shininess, 2);

        useAttribArray(gl, b_peca.a_position);
        useAttribArray(gl, b_peca.a_normal);
        gl.uniform3fv(u_color, v3.fromValues(0.8, 0.8, 0.8));

        var world = m4.create();

        const rot = v3.fromValues(0, 1, 0);
        var rotProgress = time;

        for (var i = -1; i < 2; i++) {
            for (var j = -1; j < 2; j++) {
                for (var k = -1; k < 2; k++) {
                    m4.identity(world);
                    m4.rotate(world, world, rotProgress, rot);
                    m4.translate(world, world, v3.fromValues(i*2, j*2, k*2));
                    gl.uniformMatrix4fv(u_world, false, world);

                    m4.invert(world, world);
                    m4.transpose(world, world);
                    gl.uniformMatrix4fv(u_wit, false, world);

                    gl.drawArrays(gl.TRIANGLES, 0, o_peca.position.length / 3);
                }
            }
        }

        // kill me
        var map = [
            [[ 0,  2,  0], [2, 0, 0],  [0, 0, 2],  [1, 1, 0]],   // U
            [[ 0, -2,  0], [2, 0, 0],  [0, 0, -2], [1, 1, 1]],   // D
            [[ 2,  0,  0], [0, 0, -2], [0, -2, 0], [1, 0, 0]],   // R
            [[-2,  0,  0], [0, 0, 2],  [0, -2, 0], [1, 0.5, 0]], // L
            [[ 0,  0,  2], [2, 0, 0],  [0, -2, 0], [0, 0, 1]],   // F
            [[ 0,  0, -2], [-2, 0, 0], [0, -2, 0], [0, 1, 0]]    // B
        ];

        for (var i = 0; i < 6; i++) {
            for (var j = -1; j <= 1; j++) {
                for (var k = -1; k <= 1; k++) {
                    m4.identity(world);
                    m4.rotate(world, world, rotProgress, rot);

                    const t = v3.create();
                    v3.copy(t, map[i][0]);
                    v3.scaleAndAdd(t, t, map[i][1], j);
                    v3.scaleAndAdd(t, t, map[i][2], k);
                    m4.translate(world, world, t);

                    useAttribArray(gl, bufFaces[i].a_position);
                    useAttribArray(gl, bufFaces[i].a_normal);
                    gl.uniformMatrix4fv(u_world, false, world);
                    gl.uniform3fv(u_color, map[i][3]);

                    gl.drawArrays(gl.TRIANGLES, 0, objFaces[i].position.length / 3)
                }
            }
        }

        requestAnimationFrame(drawFrame);
    }
    requestAnimationFrame(drawFrame);
}

window.addEventListener('load', () => {
    webglMain();
});
