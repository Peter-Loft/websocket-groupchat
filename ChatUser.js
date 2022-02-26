"use strict";

/** Functionality related to chatting. */

// Room is an abstraction of a chat channel
const Room = require("./Room");

/** ChatUser is a individual connection from client -> server to chat. */

class ChatUser {
  /** Make chat user: store connection-device, room.
   *
   * @param send {function} callback to send message to this user
   * @param room {Room} room user will be in
   * */

  constructor(send, roomName) {
    this._send = send; // "send" function for this user
    this.room = Room.get(roomName); // room user will be in
    this.name = null; // becomes the username of the visitor

    console.log(`created chat in ${this.room.name}`);
  }

  /** Send msgs to this client using underlying connection-send-function.
   *
   * @param data {string} message to send
   * */

  send(data) {
    try {
      this._send(data);
    } catch {
      // If trying to send to a user fails, ignore it
    }
  }

  /** Handle joining: add to room members, announce join.
   *
   * @param name {string} name to use in room
   * */

  handleJoin(name) {
    this.name = name;
    this.room.join(this);
    this.room.broadcast({
      type: "note",
      text: `${this.name} joined "${this.room.name}".`,
    });
  }

  /** Handle a chat: broadcast to room.
   *
   * @param text {string} message to send
   * */

  handleChat(text) {
    this.room.broadcast({
      name: this.name,
      type: "chat",
      text: text,
    });
  }

  /** Handle a joke: send a joke just to message sender. 
   * 
  */

  handleJoke() {
    const joke = "The best time on a clock is 6:30--hands down.";
    const data = { type: "chat", text: joke, name: "Server" }
    this.send(JSON.stringify(data));
  }

  // TODO: move the command (msgs that start with /) to the Room class, rename 
  // to send[Command].

  /** Members, returns a list of current chatroom users
   * only visible by the requesting user.
   * 
   */

  handleMembers() {
    const members = [...this.room.members].map(user => user.name);
    console.log("members: ", members);
    const msg = `In this room: ${members.join(", ")}`;
    const data = { type: "chat", text: msg, name: "Server" }
    this.send(JSON.stringify(data));
  }

  /** Handles private messaging another user. The message is only visible to 
   * the sender and the receiver.
   * 
   */

  handlePrivMsg(msgText) {
    const textParts = msgText.split(" ");
    const receiverName = textParts[1];
    const members = [...this.room.members];
    const receiver = members.find(user => user.name === receiverName);
    if (receiver === undefined) {
      this.send(JSON.stringify({
        type: "chat",
        text: `User ${receiverName} not found!`,
        name: "Server"
      }));
    }
    const toBeSent = textParts.slice(2).join(" ");
    const data = { type: "priv", text: toBeSent, name: this.name };

    this.send(JSON.stringify(data));
    receiver.send(JSON.stringify(data));
  }

  /** handleCommands container function to idenitify and call
   * special commands submitted by users.
   */

  handleCommand(msg) {
    const msgText = msg.text;

    if (msgText === "/joke") this.handleJoke();
    if (msgText === "/members") this.handleMembers();
    if (msgText.split(" ")[0] === "/priv") this.handlePrivMsg(msgText);
    // if (msgText)

  }


  /** Handle messages from client:
   *
   * @param jsonData {string} raw message data
   *
   * @example<code>
   * - {type: "join", name: username} : join
   * - {type: "chat", text: msg }     : chat
   * </code>
   */

  handleMessage(jsonData) {
    let msg = JSON.parse(jsonData);

    if (msg.type === "join") this.handleJoin(msg.name);
    else if (msg.type === "chat") {
      if (msg.text.startsWith("/")) {
        this.handleCommand(msg);
      } else {
        this.handleChat(msg.text);
      }

    }
    else throw new Error(`bad message: ${msg.type}`);
  }

  /** Connection was closed: leave room, announce exit to others. */

  handleClose() {
    this.room.leave(this);
    this.room.broadcast({
      type: "note",
      text: `${this.name} left ${this.room.name}.`,
    });
  }
}

module.exports = ChatUser;
