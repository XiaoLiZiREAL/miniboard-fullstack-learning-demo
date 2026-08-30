import { Router, type RequestHandler } from 'express'
import { validate } from '../../http/validate.js'
import { ProjectController } from './project.controller.js'
import {
  addMemberBody,
  createProjectBody,
  memberParams,
  projectIdParams,
  updateProjectBody,
} from './project.schema.js'

export function createProjectRouter(controller: ProjectController, authenticate: RequestHandler) {
  const router = Router()
  router.use(authenticate)
  router.get('/', controller.list)
  router.post('/', validate({ body: createProjectBody }), controller.create)
  router.get('/:projectId', validate({ params: projectIdParams }), controller.detail)
  router.patch(
    '/:projectId',
    validate({ params: projectIdParams, body: updateProjectBody }),
    controller.update,
  )
  router.post(
    '/:projectId/members',
    validate({ params: projectIdParams, body: addMemberBody }),
    controller.addMember,
  )
  router.delete(
    '/:projectId/members/:userId',
    validate({ params: memberParams }),
    controller.removeMember,
  )
  return router
}

