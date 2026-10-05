export class Readable {}
export class Writable {}
export class Transform {}
export class Duplex {}

const streamPolyfill = {
  Readable,
  Writable,
  Transform,
  Duplex,
};

export default streamPolyfill;
