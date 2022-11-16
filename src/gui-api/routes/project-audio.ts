import { apiGetProjectById } from '$/gui-api/state/projects';
import { KingWorld } from 'kingworld';

export default (app: KingWorld) =>
  app.get(
    '/project/:projectId/audio.wav',
    ({ params: { projectId }, set }) => {
      const project = apiGetProjectById(projectId);
      if (!project) {
        return {
          error: 'Project not found',
        };
      }
      if (!project.hasAudio) {
        return {
          error: 'Project has no audio',
        };
      }
      set.headers['Content-Type'] = 'audio/wav';
      return Bun.file(project.paths.audio);
    },
    {}
  );
