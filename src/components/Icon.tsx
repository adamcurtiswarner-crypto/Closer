import React from 'react';
import type { IconProps as PhosphorIconProps } from 'phosphor-react-native';
import {
  FlameIcon,
  TargetIcon,
  SparkleIcon,
  GameControllerIcon,
  CoffeeIcon,
  HourglassMediumIcon,
  CameraIcon,
  SunDimIcon,
  CloudIcon,
  CloudRainIcon,
  BinocularsIcon,
  LockIcon,
  CalendarBlankIcon,
  HeartIcon,
  HeartbeatIcon,
  TrophyIcon,
  ChatCircleIcon,
  CaretRightIcon,
  CaretLeftIcon,
  CheckIcon,
  ChecksIcon,
  XIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ArrowLeftIcon,
  StarIcon,
  GearSixIcon,
  WarningIcon,
  SortAscendingIcon,
  SortDescendingIcon,
  DeviceMobileCameraIcon,
  ImageSquareIcon,
  ChatTextIcon,
  MapPinIcon,
  PathIcon,
  HandshakeIcon,
  CompassIcon,
  LightbulbIcon,
  ClockCounterClockwiseIcon,
} from 'phosphor-react-native';
import { iconSize } from '@/config/theme';

const iconMap = {
  flame: FlameIcon,
  target: TargetIcon,
  sparkle: SparkleIcon,
  'game-controller': GameControllerIcon,
  coffee: CoffeeIcon,
  hourglass: HourglassMediumIcon,
  camera: CameraIcon,
  'sun-dim': SunDimIcon,
  cloud: CloudIcon,
  'cloud-rain': CloudRainIcon,
  binoculars: BinocularsIcon,
  lock: LockIcon,
  calendar: CalendarBlankIcon,
  heart: HeartIcon,
  heartbeat: HeartbeatIcon,
  trophy: TrophyIcon,
  'chat-circle': ChatCircleIcon,
  'chat-text': ChatTextIcon,
  'caret-right': CaretRightIcon,
  'caret-left': CaretLeftIcon,
  check: CheckIcon,
  checks: ChecksIcon,
  x: XIcon,
  'arrow-right': ArrowRightIcon,
  'arrow-left': ArrowLeftIcon,
  'arrow-up': ArrowUpIcon,
  'arrow-down': ArrowDownIcon,
  star: StarIcon,
  gear: GearSixIcon,
  warning: WarningIcon,
  'sort-ascending': SortAscendingIcon,
  'sort-descending': SortDescendingIcon,
  'device-mobile': DeviceMobileCameraIcon,
  image: ImageSquareIcon,
  'map-pin': MapPinIcon,
  path: PathIcon,
  handshake: HandshakeIcon,
  compass: CompassIcon,
  lightbulb: LightbulbIcon,
  'clock-counter-clockwise': ClockCounterClockwiseIcon,
} as const;

export type IconName = keyof typeof iconMap;

interface IconComponentProps {
  name: IconName;
  size?: keyof typeof iconSize | number;
  color?: string;
  weight?: PhosphorIconProps['weight'];
}

export function Icon({ name, size = 'md', color = '#78716c', weight = 'light' }: IconComponentProps) {
  const IconComponent = iconMap[name];
  const resolvedSize = typeof size === 'number' ? size : iconSize[size];
  return <IconComponent size={resolvedSize} color={color} weight={weight} />;
}
