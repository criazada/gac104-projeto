async function loadObjUrl(url) {
    const resp = await fetch(url);
    return parseObj(await resp.text());
}

async function webglMain() {
    const canvas = document.getElementById("webgl");
    /** @type {WebGLRenderingContext} */
    const gl = canvas.getContext("webgl");
    if (!gl) {
        console.error("WebGL não suportado");
    }

    const m4 = glMatrix.mat4;
    const v3 = glMatrix.vec3;

    const vertexShader = createShaderFromScript(gl, "cubo-vert");
    const fragShader = createShaderFromScript(gl, "cubo-frag");

    const program = createProgram(gl, vertexShader, fragShader);

    const u_vp = gl.getUniformLocation(program, "u_viewProjection");
    const u_world = gl.getUniformLocation(program, "u_world");
    const u_wit = gl.getUniformLocation(program, "u_worldInverseTranspose");

    const u_lightPos = gl.getUniformLocation(program, "u_lightPos");
    const u_lightColor = gl.getUniformLocation(program, "u_lightColor");
    const u_viewPos = gl.getUniformLocation(program, "u_viewPos");
    const u_ambient = gl.getUniformLocation(program, "u_ambient");
    const u_specularStrength = gl.getUniformLocation(program, "u_specularStrength");
    const u_shininess = gl.getUniformLocation(program, "u_shininess");

    const o_peca = await loadObjUrl("obj/peca.obj");

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
        a_texcoord: {
            type: gl.FLOAT,
            size: 2,
            value: o_peca.texcoord
        }
    });

    const instanceData = [];
    var world = m4.create();
    for (var i = -1; i <= 1; i++) {
        for (var j = -1; j <= 1; j++) {
            for (var k = -1; k <= 1; k++) {
                m4.fromTranslation(world, v3.fromValues(i*2, j*2, k*2));
                instanceData.push(m4.clone(world));
            }
        }
    }

    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 2, 2, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0,0,0,255,255,0,255,255,0,0,0,255,255,0,255,255]))
    gl.generateMipmap(gl.TEXTURE_2D);
    var img = new Image();
    img.src = "obj/peca.png";
    img.addEventListener("load", function() {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
        gl.generateMipmap(gl.TEXTURE_2D);
    });

    var rotating = {
        start: 0,
        rIdx: [-1, -1, -1],
        reversed: false,
    };

    const rotDuration = 0.3;
    const rotationAxis = [
        v3.fromValues(1, 0, 0),
        v3.fromValues(0, 1, 0),
        v3.fromValues(0, 0, 1)
    ];

    function drawFrame(time) {
        time *= 0.001;

        /** @type {WebGLRenderingContext} */

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

        gl.uniform3fv(u_lightPos, [5, 9, 10]);
        gl.uniform3fv(u_lightColor, [1, 1, 1]);
        gl.uniform3fv(u_viewPos, camPos);
        gl.uniform1f(u_ambient, 0.1);
        gl.uniform1f(u_specularStrength, 0.5);
        gl.uniform1f(u_shininess, 256);

        useAttribArray(gl, b_peca.a_position);
        useAttribArray(gl, b_peca.a_normal);
        useAttribArray(gl, b_peca.a_texcoord);

        const r = rotating.rIdx;
        var isRotating = rotating.start > 0;

        const delta = time - rotating.start;
        const apply = delta > rotDuration;
        var angle = Math.min(Math.PI/2, delta/rotDuration * Math.PI / 2);
        angle = rotating.reversed ? -angle : angle;

        var axis;
        if (isRotating) {
            if (r[0] != -1) {
                axis = rotationAxis[0];
            } else if (r[1] != -1) {
                axis = rotationAxis[1];
            } else if (r[2] != -1) {
                axis = rotationAxis[2];
            }
        }

        var world = m4.create();
        for (var i = 0; i < 3; i++) {
            for (var j = 0; j < 3; j++) {
                for (var k = 0; k < 3; k++) {
                    var idx = (i * 3 + j) * 3 + k;
                    m4.identity(world);
                    const objworld = instanceData[idx];
                    if (isRotating && (r[0] == i || r[1] == j || r[2] == k)) {
                        m4.rotate(world, world, angle, axis);
                        var dest = apply ? objworld : world;
                        m4.multiply(dest, world, objworld);
                        gl.uniformMatrix4fv(u_world, false, dest);
                    } else {
                        gl.uniformMatrix4fv(u_world, false, objworld);
                    }
                    gl.drawArrays(gl.TRIANGLES, 0, o_peca.position.length / 3);            
                }
            }
        }

        if (apply) {
            rotating.start = 0;
        }

        requestAnimationFrame(drawFrame);
    }
    requestAnimationFrame(drawFrame);
}

window.addEventListener('load', () => {
    webglMain();
});
