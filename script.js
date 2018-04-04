class Object3D {

    constructor (webgl, name, vertices, color, faces, normals) {
      this.name = name;
      this.color = color;
      this.original = color;

      this.facesBuffer = webgl.createBuffer();
      this.verticesBuffer = webgl.createBuffer();
      this.normalsBuffer = webgl.createBuffer();

      webgl.bindBuffer(webgl.ELEMENT_ARRAY_BUFFER, this.facesBuffer);
      webgl.bufferData(webgl.ELEMENT_ARRAY_BUFFER, new Uint32Array(faces).buffer, webgl.STATIC_DRAW);
      this.polygon_count = faces.length;

      webgl.bindBuffer(webgl.ARRAY_BUFFER, this.verticesBuffer);
      webgl.bufferData(webgl.ARRAY_BUFFER, new Float32Array(vertices).buffer, webgl.STATIC_DRAW);

      webgl.bindBuffer(webgl.ARRAY_BUFFER, this.normalsBuffer);
      webgl.bufferData(webgl.ARRAY_BUFFER, new Float32Array(normals).buffer, webgl.STATIC_DRAW);

      this.calculateBoundingSphere(vertices);
    }

    calculateBoundingSphere (vertices) {
        let maxx = -Infinity, maxy = -Infinity, maxz = -Infinity,
            minx = Infinity, miny = Infinity, minz = Infinity;

        for (let i = 0; i < vertices.length; i += 3) {

            if (vertices[i] > maxx) {
                maxx = vertices[i];
            }

            if (vertices[i] < minx) {
                minx = vertices[i];
            }

            if (vertices[i+1] > maxy) {
                maxy = vertices[i+1];
            }

            if (vertices[i+1] < miny) {
                miny = vertices[i+1];
            }

            if (vertices[i+2] > maxz) {
                maxz = vertices[i+2];
            }

            if (vertices[i+2] < minz) {
                minz = vertices[i+2];
            }

        }

        this.center = vec3.scale(
          [],
          vec3.add(
            [],
            [minx, miny, minz],
            [maxx, maxy, maxz]
          ),
          -1/2
        );

        this.radius = vec3.length(
          vec3.subtract(
            [],
            [maxx, maxy, maxz],
            [minx, miny, minz]
          )
        ) / 2;

        this.boundingBox = [
          minx, miny, minz, maxx, maxy, maxz
        ]

    }

    setTransparent () {
       this.color = [this.color[0], this.color[1], this.color[2], 0.1];
    }

    setColor (color) {
        this.color = color;
    }

    restoreColor () {
        this.color = this.original;
    }

}

class SectioningPlane3D extends Object3D {

    constructor (webgl, name, vertices, color, faces, normals) {
      super(webgl, name, vertices, color, faces, normals);

      // Store Vertices to update in the future
      this.vertices = vertices;

    }

    updateXAxis (webgl, xaxis) {

      // Modify X coordinate
      this.vertices[0] = xaxis;
      this.vertices[3] = xaxis;
      this.vertices[6] = xaxis;
      this.vertices[9] = xaxis;

      // Update Buffer
      webgl.bindBuffer(webgl.ARRAY_BUFFER, this.verticesBuffer);
      webgl.bufferData(webgl.ARRAY_BUFFER, new Float32Array(this.vertices).buffer, webgl.STATIC_DRAW);

    }

}



// Declaración de un custom element que hereda de HTMLElement
class ViewerComponent extends HTMLElement {

  constructor () {
      super();

      this.offset = 5;
      this.polygon_count = 0;
      this.target = [0, 0, 0];
      this.alpha = -Math.PI / 4;
      this.theta = Math.PI / 4;
      this.geometries = {};
      this.shouldIsolateActiveGeometry = false;

      // Touches
      this.tpCache = [];

  }

  createSectionShader () {

    const shader = this.createShader(SectionFragment, SectionVertex);

    //Configure Shader attributes
    shader.vertexPositionAttribute = this.webgl.getAttribLocation(shader, "aVertexPosition");
    this.webgl.enableVertexAttribArray(shader.vertexPositionAttribute);

    shader.normalDirectionAttribute = this.webgl.getAttribLocation(shader, "aNormalDirection");
    this.webgl.enableVertexAttribArray(shader.normalDirectionAttribute);

    shader.xAxisSection = this.webgl.getUniformLocation(shader, "x_axis_section");
    shader.pPMVatrixUniform = this.webgl.getUniformLocation(shader, "uPMVMatrix");
    shader.cameraPosition = this.webgl.getUniformLocation(shader, "cameraPosition");
    shader.normalMatrixUniform = this.webgl.getUniformLocation(shader, "normalMatrix");
    shader.pMVatrixUniform = this.webgl.getUniformLocation(shader, "uMVMatrix");
    shader.cameraPosition = this.webgl.getUniformLocation(shader, "cameraPosition");
    shader.uVertexColor = this.webgl.getUniformLocation(shader, "uVertexColor");

    return shader;

  }

  createBasicShader () {

      const shader = this.createShader(BasicFragment, BasicVertext);

      //Configure Shader attributes
      shader.vertexPositionAttribute = this.webgl.getAttribLocation(shader, "aVertexPosition");
      this.webgl.enableVertexAttribArray(shader.vertexPositionAttribute);

      shader.normalDirectionAttribute = this.webgl.getAttribLocation(shader, "aNormalDirection");
      this.webgl.enableVertexAttribArray(shader.normalDirectionAttribute);

      shader.pPMVatrixUniform = this.webgl.getUniformLocation(shader, "uPMVMatrix");
      shader.cameraPosition = this.webgl.getUniformLocation(shader, "cameraPosition");
      shader.normalMatrixUniform = this.webgl.getUniformLocation(shader, "normalMatrix");
      shader.pMVatrixUniform = this.webgl.getUniformLocation(shader, "uMVMatrix");
      shader.cameraPosition = this.webgl.getUniformLocation(shader, "cameraPosition");
      shader.uVertexColor = this.webgl.getUniformLocation(shader, "uVertexColor");

      return shader;

  }

  createShader (Fragment, Vertext) {

      //Configure Fragment Shader
      let fragShad = this.webgl.createShader(this.webgl.FRAGMENT_SHADER);
      this.webgl.shaderSource(fragShad, Fragment);
      this.webgl.compileShader(fragShad);

      if (!this.webgl.getShaderParameter(fragShad, this.webgl.COMPILE_STATUS)) {
          alert(this.webgl.getShaderInfoLog(fragShad));
          return null;
      }

      //Configure Vertext Shader
      let vertShad = this.webgl.createShader(this.webgl.VERTEX_SHADER);
      this.webgl.shaderSource(vertShad, Vertext);
      this.webgl.compileShader(vertShad);

      if (!this.webgl.getShaderParameter(vertShad, this.webgl.COMPILE_STATUS)) {
          alert(this.webgl.getShaderInfoLog(vertShad));
          return null;
      }

      //Configure Shader Program
      const shaderProgram = this.webgl.createProgram();
      this.webgl.attachShader(shaderProgram, vertShad);
      this.webgl.attachShader(shaderProgram, fragShad);
      this.webgl.linkProgram(shaderProgram);
      this.webgl.useProgram(shaderProgram);

      shaderProgram.enable = () => {
          this.activeShader = shaderProgram;
          this.webgl.useProgram(shaderProgram);
      }

      return shaderProgram;
  }

  connectedCallback () {

      //Creates the canvas in which the viewer will be rendered
      this.canvas = document.createElement('canvas');

      //Attach the canvas to the container
      this.appendChild(this.canvas);

      //Configure Canvas
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;

      this.ASPECT_RATIO = window.innerWidth / window.innerHeight;
      this.VIEWPORT = [0, 0, window.innerWidth, window.innerHeight];
      this.VFOV = 45;
      this.HFOV = (2 * Math.atan (Math.tan(this.VFOV * .5) * this.ASPECT_RATIO));

      //Get WebGL context
      this.webgl = this.canvas.getContext("webgl");

      //Configure WebGL
      this.webgl.viewport(0, 0, window.innerWidth, window.innerHeight);
      this.webgl.enable(this.webgl.DEPTH_TEST);
      this.webgl.enable(this.webgl.BLEND);
      //this.webgl.enable(this.webgl.CULL_FACE);
      this.webgl.blendEquation(this.webgl.FUNC_ADD);
      this.webgl.blendFuncSeparate(this.webgl.SRC_ALPHA, this.webgl.ONE_MINUS_SRC_ALPHA, this.webgl.ONE, this.webgl.ONE_MINUS_SRC_ALPHA);
      this.webgl.getExtension('OES_element_index_uint');
      this.webgl.getExtension('OES_standard_derivatives');

      // Shaders
      this.basicProgram = this.createBasicShader();

      // By default enable basic shader
      this.activeShader = this.basicProgram;

      //Clear Canvas
      this.webgl.clearColor(0.0, 0.0, 0.0, 0.0);

      // Test Geometries
      this.geometries[0] = new Object3D(
        this.webgl, "", SPHERE.vertices, [.8, .8, .8, 1.0], SPHERE.faces, SPHERE.normals
      );

      let maxx = -Infinity, maxy = -Infinity, maxz = -Infinity,
          minx = Infinity, miny = Infinity, minz = Infinity;

      for (let guid in this.geometries)  {

          const geometry = this.geometries[guid];
          const vertices = geometry.boundingBox;

          for (let i = 0; i < vertices.length; i+=3) {
              if (vertices[i] > maxx) {
                  maxx = vertices[i];
              }

              if (vertices[i] < minx) {
                  minx = vertices[i];
              }

              if (vertices[i+1] > maxy) {
                  maxy = vertices[i+1];
              }

              if (vertices[i+1] < miny) {
                  miny = vertices[i+1];
              }

              if (vertices[i+2] > maxz) {
                  maxz = vertices[i+2];
              }

              if (vertices[i+2] < minz) {
                  minz = vertices[i+2];
              }
          }

      }

      this.center = vec3.scale(
        [],
        vec3.add(
          [],
          [minx, miny, minz],
          [maxx, maxy, maxz]
        ),
        -1/2
      );

      this.radius = vec3.length(
        vec3.subtract(
          [],
          [maxx, maxy, maxz],
          [minx, miny, minz]
        )
      ) / 2;

      // Set target
      this.target = this.center;

      this.offset = this.radius / Math.min(
          Math.sin(this.VFOV * 0.5 * 0.0174533),
          Math.sin(this.HFOV * 0.5)
      );

      this.alpha = Math.PI / 4;
      this.theta = Math.PI / 4;

      //Configurate projection matrix
      this.pMatrix = mat4.create();
      mat4.perspective(this.pMatrix, 45, window.innerWidth / window.innerHeight, 0.001, 1000.0);

      this.addEventListener("mousedown", event => this.onMouseDown(event));

      this.addEventListener("wheel", event => this.onMouseWheel(event));
      this.addEventListener('touchstart', event => this.onTouchStart(event));
      this.addEventListener('touchmove', event => this.onTouchMove(event));

      document.addEventListener("mousemove", event => this.onMouseMove(event));
      document.addEventListener("mouseup", event => this.onMouseUp(event));
      document.addEventListener('touchend', event => this.onTouchEnd(event));
      this.oncontextmenu = function () { return false; }

      var texture = this.webgl.createTexture();
      this.webgl.bindTexture(this.webgl.TEXTURE_CUBE_MAP, texture);
      this.webgl.texParameteri(this.webgl.TEXTURE_CUBE_MAP, this.webgl.TEXTURE_WRAP_S, this.webgl.CLAMP_TO_EDGE);
      this.webgl.texParameteri(this.webgl.TEXTURE_CUBE_MAP, this.webgl.TEXTURE_WRAP_T, this.webgl.CLAMP_TO_EDGE);
      this.webgl.texParameteri(this.webgl.TEXTURE_CUBE_MAP, this.webgl.TEXTURE_MIN_FILTER, this.webgl.LINEAR);
      this.webgl.texParameteri(this.webgl.TEXTURE_CUBE_MAP, this.webgl.TEXTURE_MAG_FILTER, this.webgl.LINEAR);

      var faces = [["cubemap/back.jpg", this.webgl.TEXTURE_CUBE_MAP_POSITIVE_X],
                   ["cubemap/back.jpg", this.webgl.TEXTURE_CUBE_MAP_NEGATIVE_X],
                   ["cubemap/back.jpg", this.webgl.TEXTURE_CUBE_MAP_POSITIVE_Y],
                   ["cubemap/back.jpg", this.webgl.TEXTURE_CUBE_MAP_NEGATIVE_Y],
                   ["cubemap/back.jpg", this.webgl.TEXTURE_CUBE_MAP_POSITIVE_Z],
                   ["cubemap/back.jpg", this.webgl.TEXTURE_CUBE_MAP_NEGATIVE_Z]];

      faces.forEach(face => {
          var image = new Image();

          image.onload = () => {
                  this.webgl.bindTexture(this.webgl.TEXTURE_CUBE_MAP, texture);
                  this.webgl.pixelStorei(this.webgl.UNPACK_FLIP_Y_WEBGL, false);
                  this.webgl.texImage2D(face[1], 0, this.webgl.RGBA, this.webgl.RGBA, this.webgl.UNSIGNED_BYTE, image);
          };

          image.src = face[0];
      })

      //Render the scene the first time
      requestAnimationFrame(() => this.updateMVP());
  }

  onTouchStart (event) {
       this.isLeftMouseDown = event.touches.length == 1;
       this.isRightMouseDown = event.touches.length == 2;
       this.lastX = event.touches[0].pageX;
       this.lastY = event.touches[0].pageY;
   }

   onTouchMove (event) {
     event.preventDefault();

     this.dispatchEvent(new MouseEvent('mousemove', {
       'view': window,
       'bubbles': true,
       'cancelable': true,
       'clientX' : event.touches[0].pageX,
       'clientY' : event.touches[0].pageY,
     }));
   }

   onTouchEnd (event) {
     this.isLeftMouseDown = false;
     this.isRightMouseDown = false;
   }

  onMouseWheel (vent) {

    if (this.state.MODEL.section) {
        this.x_axis_section += -event.deltaY * 0.001;
        this.webgl.uniform1f(this.activeShader.xAxisSection, this.x_axis_section);
        this.sectioningPlane.updateXAxis(this.webgl, this.x_axis_section + 0.0000001);
    } else {
        this.offset += -event.deltaY * 0.005;
    }

    requestAnimationFrame(() => this.updateMVP());
  }

  onMouseDown (event) {
      this.isLeftMouseDown = event.button == 0;
      this.isRightMouseDown = event.button == 2;
      this.lastX = event.clientX;
      this.lastY = event.clientY;
  }

  onMouseMove (event) {
      event.preventDefault();

      if (this.isLeftMouseDown) {
        this.alpha -= (this.lastX - event.clientX) * 0.005;
        this.theta -= (this.lastY - event.clientY) * 0.005;
        this.lastX = event.clientX;
        this.lastY = event.clientY;
        requestAnimationFrame(() => this.updateMVP());
      }

      if (this.isRightMouseDown) {

        var right = vec3.normalize([], [this.mvMatrix[0], this.mvMatrix[4], this.mvMatrix[8]]);
        right = vec3.scale([], right, (this.lastX - event.x) * -0.005);

        var up = vec3.normalize([], [this.mvMatrix[1], this.mvMatrix[6], this.mvMatrix[9]]);
        up = vec3.scale([], up, (this.lastY - event.y) * 0.005);

        this.target = vec3.add([], this.target, vec3.add([], right, up));

        this.lastX = event.clientX;
        this.lastY = event.clientY;

        requestAnimationFrame(() => this.updateMVP());
      }
  }

  onMouseUp () {
      this.isLeftMouseDown = false;
      this.isRightMouseDown = false;
  }

  draw () {
      this.webgl.clear(this.webgl.DEPTH_BUFFER_BIT);
      this.webgl.clear(this.webgl.COLOR_BUFFER_BIT);

      // First Draw all solid objects
      for (let guid in this.geometries)  {

        const geometry = this.geometries[guid];

        this.webgl.bindBuffer(this.webgl.ARRAY_BUFFER, geometry.verticesBuffer);
        this.webgl.vertexAttribPointer(this.activeShader.vertexPositionAttribute, 3, this.webgl.FLOAT, false, 0, 0);

        this.webgl.bindBuffer(this.webgl.ARRAY_BUFFER, geometry.normalsBuffer);
        this.webgl.vertexAttribPointer(this.activeShader.normalDirectionAttribute, 3, this.webgl.FLOAT, false, 0, 0);

        this.webgl.uniform4f(this.activeShader.uVertexColor, geometry.color[0], geometry.color[1], geometry.color[2], geometry.color[3]);

        this.webgl.bindBuffer(this.webgl.ELEMENT_ARRAY_BUFFER, geometry.facesBuffer);
        this.webgl.drawElements(this.webgl.TRIANGLES, geometry.polygon_count, this.webgl.UNSIGNED_INT, 0);

      }

  }

  updateMVP () {
      let _mvMatrix = mat4.identity(mat4.create());

      _mvMatrix = mat4.rotate(_mvMatrix, _mvMatrix, this.alpha, [_mvMatrix[1], _mvMatrix[5], _mvMatrix[9]]);
      _mvMatrix = mat4.rotate(_mvMatrix, _mvMatrix, this.theta, [_mvMatrix[0], _mvMatrix[4], _mvMatrix[8]]);

      _mvMatrix = mat4.translate(_mvMatrix, _mvMatrix, this.target);

      var vec = [_mvMatrix[2], _mvMatrix[6], _mvMatrix[10]];
      var vLength = Math.sqrt(
          _mvMatrix[2] * _mvMatrix[2] +
          _mvMatrix[6] * _mvMatrix[6] +
          _mvMatrix[10] * _mvMatrix[10]
      );

      vec [0] /= vLength;
      vec [1] /= vLength;
      vec [2] /= vLength;

      vec [0] *= -this.offset;
      vec [1] *= -this.offset;
      vec [2] *= -this.offset;

      _mvMatrix = mat4.translate(_mvMatrix, _mvMatrix, vec);

      var pMVPMatrixUniform = [];
      mat4.multiply (pMVPMatrixUniform, this.pMatrix, _mvMatrix);
      this.webgl.uniformMatrix4fv(this.activeShader.pPMVatrixUniform, false, pMVPMatrixUniform);
      const inverseMvMatrix = mat4.inverse(_mvMatrix, mat4.create());
      this.webgl.uniform3f(this.activeShader.cameraPosition, inverseMvMatrix[12], inverseMvMatrix[13], inverseMvMatrix[14]);

      this.webgl.uniformMatrix4fv(this.activeShader.pMVatrixUniform, false, _mvMatrix);
      this.webgl.uniformMatrix3fv(this.activeShader.normalMatrixUniform, false, mat3.transpose([], mat4.toInverseMat3(_mvMatrix, [])));
      this.webgl.uniform3fv(this.activeShader.cameraPosition, vec3.normalize([], [inverseMvMatrix[12], inverseMvMatrix[13], inverseMvMatrix[14]]));

      // STore model view matrxi to use in pan action
      this.mvMatrix = _mvMatrix;

      requestAnimationFrame(this.draw.bind(this));
  }

}

// Definir el nuevo elemento.
customElements.define('viewer-component', ViewerComponent);
