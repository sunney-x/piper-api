import type { Action, User } from "./types";
import { Room, Rooms } from "./rooms";
import { Server, Socket } from "socket.io";
import express from "express";
import cors from "cors";
import http from "http";

const app = express();
const rooms = new Rooms();
const port: number = Number(process.env.PORT) || 5000;
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.json());
app.use(cors());

const dispatch = (socket: Socket, room: Room | undefined, action: Action) => {
  if (!room) {
    console.error("Room not found");
    return;
  }

  room.update(action);

  if (action.type === "cmd") {
    const commandMessages: {
      [key: string]: string;
    } = {
      "pause": "video is paused sir",
      "play": "video is playing sir",
      "set": "video is set sir",
    }
    action = {
      type: "add-message",
      payload: {
        author: {
          avatar: "https://i1.sndcdn.com/artworks-sUZuSm54AvHM5DzC-sRJf4A-t500x500.jpg",
          id: "6969",
          name: "ChadBot",
        },
        authorId: "6969",
        content: commandMessages[action.payload],
      }
    }
  }

  socket.broadcast.to(room.id).emit("action", action);
};

io.on("connection", (socket) => {
  let room: Room | undefined;
  let user: User | undefined;

  socket.on("join", (payload: { roomId: string; user: User }) => {
    room = rooms.getRoomById(payload.roomId);

    if (!room) {
      socket.emit("error", { message: "Room not found" });
      return socket.disconnect();
    }

    if (payload.user) {
      if (room.isUserInRoom(payload.user.id)) {
        socket.emit("error", { message: "User already in room" });
        return socket.disconnect();
      }

      user = payload.user;
    } else {
      socket.emit("error", { message: "No user provided" });
      return socket.disconnect();
    }

    dispatch(socket, room, { type: "add-user", payload: user });
    socket.emit("action", {
      type: "room",
      payload: room,
    } as Action);
    socket.join(room.id);
  });

  socket.on("action", (action: Action) => dispatch(socket, room, action));

  socket.on("disconnect", () => {
    if (!room || !user) return;

    dispatch(socket, room, {
      type: "remove-user",
      payload: user,
    });

    if (room.ownerId === user?.id) {
      dispatch(socket, room, {
        type: "set-video",
        payload: { ...room?.video, paused: true },
      });
    }
  });
});

app.get("/room/:roomId", (req, res) => {
  const roomId = req.params.roomId as string;
  const room = rooms.getRoomById(roomId);

  if (!room) {
    return res.status(404).json({ success: false, error: "Room not found" });
  }

  res.json({ success: true, room });
});

app.post("/room", (req, res) => {
  const { ownerId } = req.body;

  if (!ownerId) {
    return res.status(400).json({ success: false, error: "Missing fields" });
  }

  res.json(rooms.createRoom(ownerId));
});

server.listen(port, () =>
  console.log(`Listening on port ${port} ???`)
);
