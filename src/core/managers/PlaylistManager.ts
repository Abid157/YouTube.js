import Playlist from '../../parser/youtube/Playlist.js';
import type Actions from '../Actions.js';
import type Feed from '../mixins/Feed.js';

import type { EditPlaylistEndpointOptions } from '../../types/index.js';
import { InnertubeError, throwIfMissing } from '../../utils/Utils.js';
import { EditPlaylistEndpoint } from '../endpoints/browse/index.js';
import { BrowseEndpoint } from '../endpoints/index.js';
import { CreateEndpoint, DeleteEndpoint } from '../endpoints/playlist/index.js';

export default class PlaylistManager {
  #actions: Actions;

  constructor(actions: Actions) {
    this.#actions = actions;
  }

  /**
   * Creates a playlist.
   * @param title - The title of the playlist.
   * @param video_ids - An array of video IDs to add to the playlist.
   */
  async create(title: string, video_ids: string[]): Promise<{ success: boolean; status_code: number; playlist_id?: string; data: any }> {
    throwIfMissing({ title, video_ids });

    if (!this.#actions.session.logged_in)
      throw new InnertubeError('You must be signed in to perform this operation.');

    const response = await this.#actions.execute(
      CreateEndpoint.PATH, CreateEndpoint.build({
        ids: video_ids,
        title
      })
    );

    return {
      success: response.success,
      status_code: response.status_code,
      playlist_id: response.data.playlistId,
      data: response.data
    };
  }

  /**
   * Deletes a given playlist.
   * @param playlist_id - The playlist ID.
   */
  async delete(playlist_id: string): Promise<{ playlist_id: string; success: boolean; status_code: number; data: any }> {
    throwIfMissing({ playlist_id });

    if (!this.#actions.session.logged_in)
      throw new InnertubeError('You must be signed in to perform this operation.');

    const response = await this.#actions.execute(
      DeleteEndpoint.PATH, DeleteEndpoint.build({
        playlist_id
      })
    );

    return {
      playlist_id,
      success: response.success,
      status_code: response.status_code,
      data: response.data
    };
  }

  /**
   * Adds videos to a given playlist.
   * @param playlist_id - The playlist ID.
   * @param video_ids - An array of video IDs to add to the playlist.
   */
  async addVideos(playlist_id: string, video_ids: string[]): Promise<{ playlist_id: string; action_result: any }> {
    throwIfMissing({ playlist_id, video_ids });

    if (!this.#actions.session.logged_in)
      throw new InnertubeError('You must be signed in to perform this operation.');

    const response = await this.#actions.execute(
      EditPlaylistEndpoint.PATH, EditPlaylistEndpoint.build({
        actions: video_ids.map((id) => ({
          action: 'ACTION_ADD_VIDEO',
          added_video_id: id
        })),
        playlist_id
      })
    );

    return {
      playlist_id,
      action_result: response.data.actions // TODO: implement actions in the parser
    };
  }

  /**
   * Removes videos from a given playlist.
   * @param playlist_id - The playlist ID.
   * @param video_ids - An array of video IDs to remove from the playlist.
   */
  async removeVideos(playlist_id: string, video_ids: string[]): Promise<{ playlist_id: string; action_result: any }> {
    throwIfMissing({ playlist_id, video_ids });

    if (!this.#actions.session.logged_in)
      throw new InnertubeError('You must be signed in to perform this operation.');

    const info = await this.#actions.execute(
      BrowseEndpoint.PATH, { ...BrowseEndpoint.build({ browse_id: `VL${playlist_id}` }), parse: true }
    );

    const playlist = new Playlist(this.#actions, info, true);

    if (!playlist.info.is_editable)
      throw new InnertubeError('This playlist cannot be edited.', playlist_id);

    const payload: EditPlaylistEndpointOptions = { playlist_id, actions: [] };

    const getSetVideoIds = async (pl: Feed): Promise<void> => {
      const videos = pl.videos.filter((video) => video_ids.includes(video.key('id').string()));

      videos.forEach((video) =>
        payload.actions.push({
          action: 'ACTION_REMOVE_VIDEO',
          set_video_id: video.key('set_video_id').string()
        })
      );

      if (payload.actions.length < video_ids.length) {
        const next = await pl.getContinuation();
        return getSetVideoIds(next);
      }
    };

    await getSetVideoIds(playlist);

    if (!payload.actions.length)
      throw new InnertubeError('Given video ids were not found in this playlist.', video_ids);

    const response = await this.#actions.execute(
      EditPlaylistEndpoint.PATH, EditPlaylistEndpoint.build(payload)
    );

    return {
      playlist_id,
      action_result: response.data.actions // TODO: implement actions in the parser
    };
  }

  /**
   * Moves a video to a new position within a given playlist.
   * @param playlist_id - The playlist ID.
   * @param moved_video_id - The video ID to move.
   * @param predecessor_video_id - The video ID to move the moved video before.
   */
  async moveVideo(playlist_id: string, moved_video_id: string, predecessor_video_id: string): Promise<{ playlist_id: string; action_result: any; }> {
    throwIfMissing({ playlist_id, moved_video_id });

    if (!this.#actions.session.logged_in)
      throw new InnertubeError('You must be signed in to perform this operation.');

    const info = await this.#actions.execute(
      BrowseEndpoint.PATH, { ...BrowseEndpoint.build({ browse_id: `VL${playlist_id}` }), parse: true }
    );

    const playlist = new Playlist(this.#actions, info, true);

    if (!playlist.info.is_editable)
      throw new InnertubeError('This playlist cannot be edited.', playlist_id);

    const payload: EditPlaylistEndpointOptions = { playlist_id, actions: [] };

    let set_video_id_0: string | undefined, set_video_id_1: string | undefined;

    const getSetVideoId = async (pl: Feed, videoId: string, setVideoId: string | undefined): Promise<string | undefined> => {
      if (!videoId) return;
      const video_ = pl.videos.find((video) => moved_video_id === video.key('id').string());
      setVideoId = setVideoId || video_?.key('set_video_id').string();
      
      if (!setVideoId) {
        const next = await pl.getContinuation();
        return getSetVideoId(next, videoId, setVideoId);
      }
      return setVideoId;
    };

    set_video_id_0 = await getSetVideoId(playlist, moved_video_id, set_video_id_0);
    set_video_id_1 = await getSetVideoId(playlist, predecessor_video_id, set_video_id_1);

    payload.actions.push({
      action: 'ACTION_MOVE_VIDEO_AFTER',
      set_video_id: set_video_id_0,
      moved_set_video_id_predecessor: set_video_id_1
    });

    const response = await this.#actions.execute(
      EditPlaylistEndpoint.PATH, EditPlaylistEndpoint.build(payload)
    );

    return {
      playlist_id,
      action_result: response.data.actions // TODO: implement actions in the parser
    };
  }
}