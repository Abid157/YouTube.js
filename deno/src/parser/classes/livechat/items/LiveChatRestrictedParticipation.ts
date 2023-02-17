import { YTNode } from '../../../helpers.ts';
import Text from '../../misc/Text.ts';

class LiveChatRestrictedParticipation extends YTNode {
  message: Text;
  icon_type?: string;

  constructor(data: any) {
    super();
    this.message = new Text(data.message);
    this.icon_type = data?.icon?.iconType;
    // TODO: parse onClickCommand
  }
}

export default LiveChatRestrictedParticipation;