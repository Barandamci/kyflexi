import { Router, type IRouter } from "express";
import healthRouter from "./health";
import usersRouter from "./users";
import conversationsRouter from "./conversations";
import messagesRouter from "./messages";

const router: IRouter = Router();

router.use(healthRouter);
router.use(usersRouter);
router.use(conversationsRouter);
router.use(messagesRouter);

export default router;
