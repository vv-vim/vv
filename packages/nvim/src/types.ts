export type RequestMessage = [0, number, string, any[]];
export type ResponseMessage = [1, number, any, any];
export type NotificationMessage = [2, string, any[]];

export type MessageType = RequestMessage | ResponseMessage | NotificationMessage;
export type ReadCallback = (message: MessageType) => void;
export type OnCloseCallback = () => void;

export type NvimTransport = {
  /**
   * Send message to nvim api.
   * https://neovim.io/doc/user/api.html
   */
  write: (id: number, command: string, params: string[]) => void;

  /**
   * Add callback when data from nvim API received. Message should be in unpacked RPC format:
   * https://github.com/msgpack-rpc/msgpack-rpc/blob/master/spec.md#messagepack-rpc-protocol-specification
   */
  read: (callback: ReadCallback) => void;

  /**
   * Add callback that will be called when transport is closed, i.e. nvim probably closed.
   */
  onClose: (callback: OnCloseCallback) => void;
};
