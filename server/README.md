## Acadify Backend (Node.js + Express)

Backend foundation for the **Acadify** MERN application, built with Node.js, Express, and MongoDB (via Mongoose). Uses JWT-based authentication and a modular, production-ready structure.

### Tech Stack

- **Runtime**: Node.js
- **Framework**: Express
- **Database**: MongoDB (Mongoose ODM)
- **Auth**: JWT (`jsonwebtoken`), password hashing (`bcryptjs`)

### Project Structure

```text
server.js
config/
  db.js
controllers/
  authController.js
middleware/
  authMiddleware.js
models/
  User.js
routes/
  authRoutes.js
.env.example
package.json
```

### Setup

1. **Install dependencies**

```bash
npm install
```

2. **Create environment file**

Copy `.env.example` to `.env` and set your values:

- `PORT` – server port (e.g. 5000)
- `MONGO_URI` – MongoDB connection string
- `JWT_SECRET` – strong secret key for JWT signing

3. **Run the server**

```bash
# development
npm run dev

# production
npm start
```

The server will start on `http://localhost:PORT` (default `http://localhost:5000`).

### API Endpoints

- **POST** `/api/auth/signup`  
  Body: `{ "name": string, "email": string, "password": string }`

- **POST** `/api/auth/login`  
  Body: `{ "email": string, "password": string }`  
  Returns: `{ token, user }`

Protected routes should use the `authMiddleware` to verify JWTs and populate `req.user`.

