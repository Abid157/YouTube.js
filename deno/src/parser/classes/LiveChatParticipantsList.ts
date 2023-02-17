import Parser from '../index.ts';
import Text from './misc/Text.ts';
import { ObservedArray, YTNode } from '../helpers.ts';
import type LiveChatParticipant from './LiveChatParticipant.ts';

class LiveChatParticipantsList extends YTNode {
  static type = 'LiveChatParticipantsList';

  title: Text;
  participants: ObservedArray<LiveChatParticipant>;

  constructor(data: any) {
    super();
    this.title = new Text(data.title);
    this.participants = Parser.parseArray<LiveChatParticipant>(data.participants);
  }
}

export default LiveChatParticipantsList;