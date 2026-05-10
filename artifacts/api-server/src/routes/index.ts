import { Router, type IRouter } from "express";
import healthRouter from "./health";
import usersRouter from "./users";
import conversationsRouter from "./conversations";
import messagesRouter from "./messages";
import groupsRouter from "./groups";
import storageRouter from "./storage";
import adminRouter from "./admin";
import authRouter from "./auth";

const router: IRouter = Router();

router.use(healthRouter);
router.use(usersRouter);
router.use(conversationsRouter);
router.use(messagesRouter);
router.use(groupsRouter);
router.use(storageRouter);
router.use(adminRouter);
router.use(authRouter);

export default router;
