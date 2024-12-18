"use strict";

const vs = `
attribute vec4 a_position;
attribute vec3 a_normal;
attribute vec2 a_texcoord;
attribute vec4 a_color;
 
uniform mat4 u_projection;
uniform mat4 u_view;
uniform mat4 u_world;
uniform vec3 u_viewWorldPosition;

 
varying vec3 v_normal;
varying vec3 v_surfaceToView;
varying vec2 v_texcoord;
varying vec4 v_color;
 
void main() {
  vec4 worldPosition = u_world * a_position;
  gl_Position = u_projection * u_view * worldPosition;
  v_surfaceToView = u_viewWorldPosition - worldPosition.xyz;
  v_normal = mat3(u_world) * a_normal;
  v_texcoord = a_texcoord;
  v_color = a_color;
}
`;
 
const fs = `
precision mediump float;
 
varying vec3 v_normal;
varying vec3 v_surfaceToView;
varying vec2 v_texcoord;
varying vec4 v_color;
 
uniform vec4 u_diffuse;
uniform sampler2D diffuseMap;
uniform vec3 ambient;
uniform vec3 emissive;
uniform vec3 specular;
uniform sampler2D specularMap;
uniform float shininess;
uniform float opacity;
uniform vec3 u_ambientLight;

uniform vec3 u_lightDirection;
 
void main () {
  vec3 normal = normalize(v_normal);

  vec3 surfaceToViewDirection = normalize(v_surfaceToView);
  vec3 halfVector = normalize(u_lightDirection + surfaceToViewDirection);

  float fakeLight = dot(u_lightDirection, normal) * .5 + .5;
  float specularLight = clamp(dot(normal, halfVector), 0.0, 1.0);

  vec4 specularMapColor = texture2D(specularMap, v_texcoord);
  vec3 effectiveSpecular = specular * specularMapColor.rgb;

  vec4 effectiveDiffuse = texture2D(diffuseMap, v_texcoord);
  vec3 effectiveDiffuseColor = effectiveDiffuse.rgb;

  vec3 effectiveColor = effectiveDiffuseColor * fakeLight + effectiveSpecular * specularLight;

  vec3 finalColor = effectiveColor * (1.0 - opacity) + u_ambientLight * opacity;
  gl_FragColor = vec4(finalColor, effectiveDiffuse.a);

  gl_FragColor.rgb += emissive;

  gl_FragColor.rgb += ambient;

}
`;