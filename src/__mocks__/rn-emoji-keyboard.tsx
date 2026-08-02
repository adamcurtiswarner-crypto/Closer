// Jest stand-in for rn-emoji-keyboard (ships untranspiled ESM). Renders
// nothing; tests drive selection by calling props captured elsewhere or by
// asserting open/close state through component behavior.
const EmojiPicker = (_props: {
  open: boolean;
  onClose: () => void;
  onEmojiSelected: (e: { emoji: string }) => void;
  [key: string]: unknown;
}) => null;

export default EmojiPicker;
