/// <reference types="vite/client" />

// Binary modules (fonts for the social preview card) are bundled by the Cloudflare Vite plugin.
declare module "*.bin" {
  const data: ArrayBuffer;
  export default data;
}
