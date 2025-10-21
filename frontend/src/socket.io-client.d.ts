declare module 'socket.io-client' {
  import { ManagerOptions, SocketOptions as ISocketOptions, Socket as ISocket } from 'socket.io-client/build/esm/socket';
  
  interface Socket extends ISocket {}
  
  interface SocketOptions extends ISocketOptions {}
  
  function io(url?: string, options?: Partial<ManagerOptions & SocketOptions>): Socket;
  
  export default io;
  export { io, Socket };
}