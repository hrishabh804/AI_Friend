import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-key";
const WS_JWT_SECRET = process.env.WS_JWT_SECRET || "your-ws-secret-key";

export const generateWebSocketToken = (sessionId: string, userId: string) => {
  return jwt.sign({ sessionId, userId }, WS_JWT_SECRET, { expiresIn: "5m" });
};

export const verifyWebSocketToken = (token: string) => {
  try {
    return jwt.verify(token, WS_JWT_SECRET) as { sessionId: string; userId: string };
  } catch (error) {
    return null;
  }
};
