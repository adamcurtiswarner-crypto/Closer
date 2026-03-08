import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  Image,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Icon } from '@components';
import { pickImage } from '@/services/imageUpload';
import { MILESTONE_CATEGORIES, type MilestoneCategory, type CreateMilestoneInput } from '@/hooks/useMilestones';
import { hapticImpact, ImpactFeedbackStyle } from '@utils/haptics';

interface AddMilestoneModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (input: CreateMilestoneInput) => void;
  isSubmitting: boolean;
}

export function AddMilestoneModal({ visible, onClose, onSubmit, isSubmitting }: AddMilestoneModalProps) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<MilestoneCategory>('anniversary');
  const [customTitle, setCustomTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);

  const reset = () => {
    setTitle('');
    setCategory('anniversary');
    setCustomTitle('');
    setDescription('');
    setDate(new Date());
    setImageUri(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = () => {
    const finalTitle = category === 'custom' ? customTitle : title || MILESTONE_CATEGORIES.find(c => c.value === category)?.label || '';
    if (!finalTitle.trim()) return;

    hapticImpact(ImpactFeedbackStyle.Medium);
    onSubmit({
      title: finalTitle.trim(),
      category,
      description: description.trim() || undefined,
      imageUri: imageUri || undefined,
      date,
    });
    reset();
  };

  const handlePickImage = async () => {
    const uri = await pickImage();
    if (uri) setImageUri(uri);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>New Milestone</Text>
          <TouchableOpacity onPress={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#c97454" />
            ) : (
              <Text style={styles.saveText}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.form} contentContainerStyle={styles.formContent}>
          <Text style={styles.label}>Type</Text>
          <View style={styles.categoryGrid}>
            {MILESTONE_CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.value}
                style={[styles.categoryPill, category === cat.value && styles.categoryPillActive]}
                onPress={() => {
                  setCategory(cat.value);
                  if (cat.value !== 'custom') setTitle(cat.label);
                }}
              >
                <Text style={[styles.categoryPillText, category === cat.value && styles.categoryPillTextActive]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {category === 'custom' && (
            <Animated.View entering={FadeIn.duration(200)}>
              <Text style={styles.label}>Title</Text>
              <TextInput
                style={styles.input}
                value={customTitle}
                onChangeText={setCustomTitle}
                placeholder="What happened?"
                placeholderTextColor="#a8a29e"
              />
            </Animated.View>
          )}

          <Text style={styles.label}>Date</Text>
          <TouchableOpacity style={styles.dateBtn} onPress={() => setShowDatePicker(true)}>
            <Icon name="calendar" size="sm" color="#78716c" />
            <Text style={styles.dateBtnText}>
              {date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={date}
              mode="date"
              maximumDate={new Date()}
              onChange={(_, selectedDate) => {
                setShowDatePicker(Platform.OS === 'ios');
                if (selectedDate) setDate(selectedDate);
              }}
            />
          )}

          <Text style={styles.label}>Description (optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="A few words about this moment..."
            placeholderTextColor="#a8a29e"
            multiline
            numberOfLines={3}
          />

          <Text style={styles.label}>Photo (optional)</Text>
          {imageUri ? (
            <TouchableOpacity onPress={handlePickImage}>
              <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="cover" />
              <Text style={styles.changePhotoText}>Tap to change</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.photoBtn} onPress={handlePickImage}>
              <Icon name="camera" size="sm" color="#78716c" />
              <Text style={styles.photoBtnText}>Add a photo</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafaf9',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f4',
  },
  cancelText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#78716c',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
    color: '#1c1917',
  },
  saveText: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
    color: '#c97454',
  },
  form: {
    flex: 1,
  },
  formContent: {
    padding: 20,
    paddingBottom: 40,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
    color: '#78716c',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 20,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f4',
  },
  categoryPillActive: {
    backgroundColor: '#c97454',
  },
  categoryPillText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#57534e',
  },
  categoryPillTextActive: {
    color: '#ffffff',
  },
  input: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e7e5e4',
    padding: 14,
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#1c1917',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  dateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e7e5e4',
    padding: 14,
  },
  dateBtnText: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#1c1917',
  },
  photoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 32,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e7e5e4',
    borderStyle: 'dashed',
  },
  photoBtnText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#78716c',
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  changePhotoText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#a8a29e',
    textAlign: 'center',
    marginTop: 6,
  },
});
