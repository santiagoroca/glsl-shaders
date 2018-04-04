const BasicVertext =  `

    attribute lowp vec3 aVertexPosition;
    attribute lowp vec3 aNormalDirection;
    uniform mat4 uPMVMatrix;
    uniform mat4 uMVMatrix;
    uniform mat3 normalMatrix;
    varying vec3 vPosition;
    varying vec3 vNormal;

    void main(void) {
        gl_Position = uPMVMatrix * vec4(aVertexPosition, 1.0);
  	    vPosition = -(uMVMatrix * vec4(aVertexPosition, 1.0)).xyz;
  	    vNormal = normalize(normalMatrix * aNormalDirection);
    }

`;
