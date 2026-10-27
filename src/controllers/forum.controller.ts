import type { Request, Response } from "express";
import * as forum from "../services/forum.service.js";
import { getValidated } from "../middleware/validate.js";
import type {
  CreateAnswerInput,
  CreateQuestionInput,
  ListQuestionsQuery,
  UpdateAnswerInput,
  UpdateQuestionInput,
} from "../schemas/forum.js";

type IdParams = { id: number };

export async function listQuestions(req: Request, res: Response) {
  const { query } = getValidated<unknown, ListQuestionsQuery>(res);
  res.json(await forum.listQuestions(query, req.user));
}

export async function stats(_req: Request, res: Response) {
  res.json(await forum.forumStats());
}

export async function getQuestion(req: Request, res: Response) {
  const { params } = getValidated<unknown, unknown, IdParams>(res);
  res.json(await forum.getQuestion(params.id, req.user));
}

export async function createQuestion(req: Request, res: Response) {
  const { body } = getValidated<CreateQuestionInput>(res);
  res.status(201).json(await forum.createQuestion(body, req.user!));
}

export async function updateQuestion(req: Request, res: Response) {
  const { body, params } = getValidated<UpdateQuestionInput, unknown, IdParams>(res);
  res.json(await forum.updateQuestion(params.id, body, req.user!));
}

export async function setSolved(req: Request, res: Response) {
  const { body, params } = getValidated<{ isSolved: boolean }, unknown, IdParams>(res);
  res.json(await forum.setSolved(params.id, body.isSolved, req.user!));
}

export async function deleteQuestion(req: Request, res: Response) {
  const { params } = getValidated<unknown, unknown, IdParams>(res);
  await forum.deleteQuestion(params.id, req.user!);
  res.status(204).end();
}

export async function listAnswers(req: Request, res: Response) {
  const { params } = getValidated<unknown, unknown, IdParams>(res);
  res.json(await forum.listAnswers(params.id, req.user));
}

export async function createAnswer(req: Request, res: Response) {
  const { body, params } = getValidated<CreateAnswerInput, unknown, IdParams>(res);
  res.status(201).json(await forum.createAnswer(params.id, body, req.user!));
}

export async function updateAnswer(req: Request, res: Response) {
  const { body, params } = getValidated<UpdateAnswerInput, unknown, IdParams>(res);
  res.json(await forum.updateAnswer(params.id, body, req.user!));
}

export async function deleteAnswer(req: Request, res: Response) {
  const { params } = getValidated<unknown, unknown, IdParams>(res);
  await forum.deleteAnswer(params.id, req.user!);
  res.status(204).end();
}
