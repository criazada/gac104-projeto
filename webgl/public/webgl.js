var rotQueue = [];
var mov = [];

const rots = ['L', 'M', 'R', 'D', 'E', 'U', 'F', 'S', 'B'];
const rotMap = {
    'L': [[0, -1, -1], false],
    'M': [[1, -1, -1], false],
    'R': [[2, -1, -1], true],
    'D': [[-1, 0, -1], true],
    'E': [[-1, 1, -1], true],
    'U': [[-1, 2, -1], false],
    'F': [[-1, -1, 2], true],
    'S': [[-1, -1, 1], false],
    'B': [[-1, -1, 0], false]
};

function startRotation(r, rev, dontreverse) {
    var rotating = true;
    var start = 0;
    var rIdx = rotMap[r][0].map(v => v-1);
    var reversed = rotMap[r][1];
    if (rev) {
        reversed = !reversed;
    }

    rotQueue.push({
        rotating,
        start,
        rIdx,
        reversed
    });

    if (!dontreverse) {
        mov.push([r, !rev]);
    }
}

function solve() {
    mov.reverse().forEach(r => startRotation(r[0], r[1], true));
    mov = [];
}

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
                m4.fromTranslation(world, v3.fromValues(i, j, k));
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

    var startRotDuration = 0.3;
    var rotDuration = 0.3;
    const rotationAxis = [
        v3.fromValues(1, 0, 0),
        v3.fromValues(0, 1, 0),
        v3.fromValues(0, 0, 1)
    ];

    var currentRotation;
    var solving = false;
    var scrambling = false;
    var exploding = {
        start: false,
        startedAt: 0,
    };
    var reconstruct = false;

    var camPitch = Math.PI/4;
    var camYaw = Math.PI/6;
    var camDist = 5;

    const up = v3.fromValues(0, 1, 0);
    const origin = v3.fromValues(0, 0, 0);
    const {sin,cos} = Math;

    function drawFrame(time) {
        time *= 0.001;

        gl.disable(gl.CULL_FACE);
        gl.enable(gl.DEPTH_TEST);

        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        resizeCanvas(gl.canvas);

        const projection = m4.create();
        m4.perspective(projection, Math.PI/2, gl.canvas.width / gl.canvas.height, 0.01, 1000);

        const view = m4.create();
        const camR = cos(camPitch)*camDist;
        const camX = sin(camYaw)*camR;
        const camY = sin(camPitch)*camDist;
        const camZ = cos(camYaw)*camR;
        const camPos = v3.fromValues(camX, camY, camZ);
        m4.targetTo(view, camPos, origin, up);
        m4.invert(view, view);

        const viewProjection = m4.create();
        m4.multiply(viewProjection, projection, view);

        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        gl.useProgram(program);
        gl.uniformMatrix4fv(u_vp, false, viewProjection);

        gl.uniform3fv(u_lightPos, camPos);
        gl.uniform3fv(u_lightColor, [1, 1, 1]);
        gl.uniform3fv(u_viewPos, camPos);
        gl.uniform1f(u_ambient, 0.1);
        gl.uniform1f(u_specularStrength, 0.5);
        gl.uniform1f(u_shininess, 256);

        useAttribArray(gl, b_peca.a_position);
        useAttribArray(gl, b_peca.a_normal);
        useAttribArray(gl, b_peca.a_texcoord);

        if (!currentRotation) {
            currentRotation = rotQueue.shift();
            if (!currentRotation) {
                solving = false;
                scrambling = false;
            }
        }

        if (solving) {
            rotDuration *= 0.999;
        } else if (!scrambling) {
            rotDuration = startRotDuration;
        }

        var rotation = currentRotation;
        var r, delta, apply, angle;
        var axis;
        if (rotation && rotation.start == 0) {
            rotation.start = time;
        }

        if (rotation) {
            r = rotation.rIdx
            delta = time - rotation.start;
            apply = delta > rotDuration;
            angle = Math.min(Math.PI/2, delta/rotDuration * Math.PI / 2);
            angle = rotation.reversed ? -angle : angle;
            if (r[0] != -2) {
                axis = rotationAxis[0];
            } else if (r[1] != -2) {
                axis = rotationAxis[1];
            } else if (r[2] != -2) {
                axis = rotationAxis[2];
            }
        }

        if (exploding.start && exploding.startedAt == 0) {
            exploding.startedAt = time;
        }

        var world = m4.create();
        if (reconstruct) {
            for (var i = -1; i <= 1; i++) {
                for (var j = -1; j <= 1; j++) {
                    for (var k = -1; k <= 1; k++) {
                        const idx = ((i + 1) * 3 + j + 1) * 3 + k + 1;
                        m4.fromTranslation(world, v3.fromValues(i, j, k));
                        instanceData[idx] = m4.clone(world);
                    }
                }
            }
            reconstruct = false;
        }

        function p(a, b) {
            return Math.abs(a - b) <= 0.1;
        }

        var tr = v3.create();

        const eDelta = time-exploding.startedAt;
        for (var i = 0; i < instanceData.length; i++) {
            const objworld = instanceData[i];

            m4.identity(world);
            m4.getTranslation(tr, objworld);
            const x = tr[0], y = tr[1], z = tr[2];
            var dest = world;
            if (exploding.start && i != 13) {
                const noise = i*Math.PI*exploding.startedAt;
                const rot = v3.fromValues(noise%1-0.5, (i*noise)%1-0.5, (i*i*noise)%1-0.5);
                v3.scale(tr, tr, eDelta*eDelta);
                m4.translate(world, world, tr);
                m4.rotate(world, world, eDelta*((i*i*noise)%1-0.5)*3, rot);
                if (eDelta > 1) {
                    m4.scale(world, world, [1/eDelta, 1/eDelta, 1/eDelta]);
                }
                m4.multiply(world, objworld, world);
            } else if (rotation && (p(x, r[0]) || p(y, r[1]) || p(z, r[2]))) {
                m4.rotate(world, world, angle, axis);
                dest = apply ? objworld : world;
                m4.multiply(dest, world, objworld);
                gl.uniformMatrix4fv(u_world, false, dest);
            } else {
                dest = objworld;
            }
            gl.uniformMatrix4fv(u_world, false, dest);
            gl.drawArrays(gl.TRIANGLES, 0, o_peca.position.length / 3);
        }

        if (apply) {
            currentRotation = undefined;
        }

        if (exploding.start && eDelta > 7) {
            reconstruct = true;
            exploding.start = false;
        }

        requestAnimationFrame(drawFrame);
    }

    window.addEventListener('keydown', (e) => {
        handleKeyDown(e.key);
    });

    function handleKeyDown(e) {
        const k = e.toUpperCase();
        if (k === ',') startRotDuration += 0.005;
        if (k === '.') startRotDuration -= 0.005;
        if (solving || scrambling || exploding.start) return;
        if (rotMap[k]) startRotation(k, e.shiftKey);
        else if (k === 'P') {
            solving = true;
            solve();
        } else if (k == 'K') {
            scrambling = true;
            rotDuration /= 10;
            for (var i = 0; i < 40; i++) {
                const idx = Math.round(Math.random() * (rots.length-1));
                startRotation(rots[idx], false);
            }
        } else if (k == 'X') {
            exploding.start = true;
            exploding.startedAt = 0;
        }
    }

    canvas.addEventListener('mousedown', () => {
        canvas.addEventListener('mousemove', handleMouseMove);
    });

    canvas.addEventListener('mouseup', e => {
        e.preventDefault();
        canvas.removeEventListener('mousemove', handleMouseMove);
    });

    canvas.addEventListener('mousemove', e => {
        handleMouseMove(e);
    });

    function handleMouseMove(e) {
        if (e.movementX || e.movementY) {
            camYaw -= e.movementX / 500;
            camPitch = Math.min(Math.max(camPitch + e.movementY / 500, -Math.PI/2), Math.PI/2);
        }
    }

    const solveButton = document.getElementById('solve');
    const randomButton = document.getElementById('random');
    const explodeButton = document.getElementById('explode');
    const minusVelButton = document.getElementById('-vel');
    const plusVelButton = document.getElementById('+vel');
    const minusZoomButton = document.getElementById('-zoom');
    const plusZoomButton = document.getElementById('+zoom');

    
    solveButton.addEventListener('click', () => {
        handleKeyDown('p');
    });

    randomButton.addEventListener('click', () => {
        handleKeyDown('k');
    });
    
    explodeButton.addEventListener('click', () => {
        handleKeyDown('x');
    });

    plusVelButton.addEventListener('click', () => {
        startRotDuration -= 0.005;
    });

    minusVelButton.addEventListener('click', () => {
        startRotDuration += 0.005;
    });
    minusZoomButton.addEventListener('click', () => {
        handelWheel(130);
    });
    plusZoomButton.addEventListener('click', () => {
        handelWheel(-130);
    });

    canvas.addEventListener('wheel', e => {
        handelWheel(e.deltaY);
    });

    function handelWheel(vel) {
        camDist = Math.max(3, camDist + vel / 150);
    }
    requestAnimationFrame(drawFrame);
}

window.addEventListener('load', () => {
    (function () {
        var old = console.log;
        var logger = document.getElementById('log');
        console.log = function (message) {
            if (typeof message == 'object') {
                logger.innerHTML += (JSON && JSON.stringify ? JSON.stringify(message) : message) + '<br />';
            } else {
                logger.innerHTML += message + '<br />';
            }
        }
        console.error = console.log;
        console.warn = console.log;
    });
    webglMain();
});
