import Text from './misc/Text.ts';
import { YTNode } from '../helpers.ts';

class ThumbnailOverlayHoverText extends YTNode {
  static type = 'ThumbnailOverlayHoverText';

  text: Text;
  icon_type: string;

  constructor(data: any) {
    super();
    this.text = new Text(data.text);
    this.icon_type = data.icon.iconType;
  }
}

export default ThumbnailOverlayHoverText;