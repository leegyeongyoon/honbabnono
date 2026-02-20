import React from 'react';
import { View, ViewStyle } from 'react-native';
import {
  Search, Bell, MapPin, Map, Clock, Star, MessageCircle, Home, User,
  Heart, SlidersHorizontal, MoreHorizontal, ChevronDown, ChevronRight,
  ChevronLeft, ArrowLeft, Pencil, Trash2, ImageIcon, Users, Calendar,
  Send, MoreVertical, X, Check, ChevronUp, Settings, Plus, Minus,
  Mail, Phone, CreditCard, DollarSign, Smile, Coffee, Tag, Info,
  ExternalLink, Gift, Award, UtensilsCrossed, Megaphone, MailOpen,
  Building2, Flame, Fish, Wine, Cake, Navigation, List, Compass,
  CheckCircle, XCircle, AlertTriangle, AlertCircle, Zap, ArrowUpLeft,
  ArrowRight, Smartphone, BellOff, Pizza, Beef, CookingPot, GlassWater,
  type LucideIcon,
} from 'lucide-react-native';
import { COLORS } from '../styles/colors';

export type IconName =
  | 'search' | 'bell' | 'map-pin' | 'map' | 'clock' | 'star'
  | 'message-circle' | 'home' | 'user' | 'heart' | 'filter'
  | 'more-horizontal' | 'chevron-down' | 'chevron-right' | 'chevron-left'
  | 'arrow-left' | 'edit' | 'trash-2' | 'image' | 'users' | 'calendar'
  | 'send' | 'more-vertical' | 'x' | 'check' | 'chevron-up' | 'settings'
  | 'plus' | 'minus' | 'mail' | 'phone' | 'credit-card' | 'dollar-sign'
  | 'smile' | 'coffee' | 'tag' | 'info' | 'external-link' | 'gift'
  | 'award' | 'utensils' | 'megaphone' | 'mail-open' | 'building'
  | 'soup' | 'food-tray' | 'fish' | 'pizza' | 'wine' | 'chef'
  | 'party' | 'meat' | 'pot' | 'tray' | 'shrimp' | 'drumstick'
  | 'glass' | 'silverware' | 'fire' | 'concierge-bell' | 'wine-glass'
  | 'birthday-cake' | 'drumstick-bite' | 'flame' | 'navigation' | 'list'
  | 'check-circle' | 'x-circle' | 'alert-triangle' | 'alert-circle'
  | 'zap' | 'arrow-up-left' | 'arrow-right' | 'times' | 'smartphone'
  | 'notifications-none' | 'compass';

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  style?: ViewStyle;
  strokeWidth?: number;
  fill?: string;
}

const iconMap: Record<IconName, LucideIcon> = {
  'search': Search,
  'bell': Bell,
  'map-pin': MapPin,
  'map': Map,
  'clock': Clock,
  'star': Star,
  'message-circle': MessageCircle,
  'home': Home,
  'user': User,
  'heart': Heart,
  'filter': SlidersHorizontal,
  'more-horizontal': MoreHorizontal,
  'chevron-down': ChevronDown,
  'chevron-right': ChevronRight,
  'chevron-left': ChevronLeft,
  'arrow-left': ArrowLeft,
  'edit': Pencil,
  'trash-2': Trash2,
  'image': ImageIcon,
  'users': Users,
  'calendar': Calendar,
  'send': Send,
  'more-vertical': MoreVertical,
  'x': X,
  'check': Check,
  'chevron-up': ChevronUp,
  'settings': Settings,
  'plus': Plus,
  'minus': Minus,
  'mail': Mail,
  'phone': Phone,
  'credit-card': CreditCard,
  'dollar-sign': DollarSign,
  'smile': Smile,
  'coffee': Coffee,
  'tag': Tag,
  'info': Info,
  'external-link': ExternalLink,
  'gift': Gift,
  'award': Award,
  'utensils': UtensilsCrossed,
  'megaphone': Megaphone,
  'mail-open': MailOpen,
  'building': Building2,
  'soup': CookingPot,
  'food-tray': UtensilsCrossed,
  'fish': Fish,
  'pizza': Pizza,
  'wine': Wine,
  'chef': UtensilsCrossed,
  'party': Cake,
  'meat': Beef,
  'pot': CookingPot,
  'tray': UtensilsCrossed,
  'shrimp': Fish,
  'drumstick': Beef,
  'glass': GlassWater,
  'silverware': UtensilsCrossed,
  'fire': Flame,
  'concierge-bell': Bell,
  'wine-glass': Wine,
  'birthday-cake': Cake,
  'drumstick-bite': Beef,
  'flame': Flame,
  'navigation': Navigation,
  'compass': Compass,
  'list': List,
  'check-circle': CheckCircle,
  'x-circle': XCircle,
  'alert-triangle': AlertTriangle,
  'alert-circle': AlertCircle,
  'zap': Zap,
  'arrow-up-left': ArrowUpLeft,
  'arrow-right': ArrowRight,
  'times': X,
  'smartphone': Smartphone,
  'notifications-none': BellOff,
};

const SimpleIcon: React.FC<IconProps> = ({
  name,
  size = 24,
  color = COLORS.text.secondary,
  style,
  strokeWidth = 2,
  fill,
}) => {
  const LucideComponent = iconMap[name];

  if (!LucideComponent) {
    return (
      <View
        style={[
          {
            width: size,
            height: size,
            alignItems: 'center',
            justifyContent: 'center',
          },
          style,
        ]}
      />
    );
  }

  return (
    <View
      style={[
        {
          alignItems: 'center',
          justifyContent: 'center',
          width: size,
          height: size,
        },
        style,
      ]}
    >
      <LucideComponent
        size={size}
        color={color}
        strokeWidth={strokeWidth}
        fill={fill || 'none'}
      />
    </View>
  );
};

export { SimpleIcon };
export type { IconProps };
