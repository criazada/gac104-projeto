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
    const u_reverseLight = gl.getUniformLocation(program, "u_reverseLightDirection");
    const u_wit = gl.getUniformLocation(program, "u_worldInverseTranspose");
    const u_color = gl.getUniformLocation(program, "u_color");

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
        m4.translate(view, view, v3.fromValues(0, 5, 10));
        m4.rotate(view, view, -Math.PI/6, v3.fromValues(1, 0, 0));
        m4.invert(view, view);
    
        const viewProjection = m4.create();
        m4.multiply(viewProjection, projection, view);
        
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        
        gl.useProgram(program);
        gl.uniformMatrix4fv(u_vp, false, viewProjection);

        const light = v3.fromValues(0.5, 0.7, 1);
        gl.uniform3fv(u_reverseLight, v3.normalize(light, light));
        useAttribArray(gl, b_peca.a_position);
        useAttribArray(gl, b_peca.a_normal);
        gl.uniform3fv(u_color, v3.fromValues(0.8, 0.8, 0.8));

        var world = m4.create();

        const rot = v3.fromValues(0, 1, 0);

        for (var i = -1; i < 2; i++) {
            for (var j = -1; j < 2; j++) {
                for (var k = -1; k < 2; k++) {
                    m4.identity(world);
                    if (j == 1) {
                        m4.rotate(world, world, time, v3.fromValues(0, 1, 0));
                    }
                    // m4.rotate(world, world, time, rot);
                    m4.translate(world, world, v3.fromValues(i*2, j*2, k*2));
                    gl.uniformMatrix4fv(u_world, false, world);

                    m4.invert(world, world);
                    m4.transpose(world, world);
                    gl.uniformMatrix4fv(u_wit, false, world);

                    gl.drawArrays(gl.TRIANGLES, 0, o_peca.position.length / 3);
                }
            }
        }

        var map = [
            [[ 0,  2,  0], [2, 0, 0],  [0, 0, 2], [1, 1, 0]],     // U
            [[ 0, -2,  0], [2, 0, 0],  [0, 0, -2],  [1, 1, 1]],   // D
            [[ 2,  0,  0], [0, 0, -2], [0, -2, 0] , [1, 0, 0]],   // R
            [[-2,  0,  0], [0, 0, 2],  [0, -2, 0] , [1, 0.5, 0]], // L
            [[ 0,  0,  2], [2, 0, 0],  [0, -2, 0] , [0, 0, 1]],   // F
            [[ 0,  0, -2], [-2, 0, 0], [0, -2, 0] , [0, 1, 0]]    // B
        ];

        for (var i = 0; i < 6; i++) {
            for (var j = -1; j <= 1; j++) {
                for (var k = -1; k <= 1; k++) {
                    var idx = (j + 1) * 3 + k + 1;
                    var rotate = false;

                    m4.identity(world);

                    if (i == 0) {
                        rotate = true;
                    }
                    if (i >= 2 && k == -1) {
                        rotate = true;
                    }
                    if (rotate) {
                        m4.rotate(world, world, time, v3.fromValues(0, 1, 0));
                    }
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
