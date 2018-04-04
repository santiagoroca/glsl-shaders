const BasicFragment = `

    precision highp float;

    struct light
    {
     int a;
    };


    uniform mat3 normalMatrix;
    uniform vec4 uVertexColor;
    uniform samplerCube cubeTexture;

    varying vec3 vPosition;
    varying vec3 vNormal;

    const vec3 ambient = vec3(0.1);
    vec3 lights[2];

    void main() {

      lights[0] = vec3(0.0, 0.0, 10.0);
      lights[1] = vec3(10.0, 0.0, 0.0);

      vec3 eye = normalize(vPosition);
      vec3 normal = normalize(vNormal);
      vec3 outColor = ambient;
      vec4 color = textureCube(cubeTexture, normal) * 0.1 + vec4(0.83, 0.68, 0.21, 1.0) * 0.5;

      for (int i = 0; i < 2; i++) {
          vec3 light = lights[i];
          vec3 specular = vec3(0.0);
          vec3 surfaceToLight = normalize(light - vPosition);
          float brightness = dot(normal, surfaceToLight) * 2.0;

          if (brightness > 0.0) {
              vec3 h = reflect(-surfaceToLight, normal);
              specular = vec3(0.5) * pow(max(0.0, dot(h, eye)), 10.0);
          }

          outColor += color.rgb * brightness + specular;
      }

      gl_FragColor = vec4(min(outColor, vec3(1.0)), 1.0);
    }
`;
