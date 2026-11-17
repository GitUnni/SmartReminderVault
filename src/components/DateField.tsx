import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  value: Date | null; // where the picker starts
  text: string | null; // what to show on the button (null shows the placeholder)
  placeholder?: string;
  onChange: (date: Date) => void;
};

const stripTime = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

export default function DateField({ value, text, placeholder = 'Select date', onChange }: Props) {
  const [iosOpen, setIosOpen] = useState(false);
  const [iosTemp, setIosTemp] = useState<Date>(value ?? new Date());

  const open = () => {
    const start = value ?? new Date();
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: start,
        mode: 'date',
        onChange: (event, selected) => {
          if (event.type === 'set' && selected) onChange(stripTime(selected));
        },
      });
    } else {
      setIosTemp(start);
      setIosOpen(true);
    }
  };

  return (
    <>
      <Pressable style={styles.button} onPress={open}>
        <Text style={text ? styles.text : styles.placeholder}>{text ?? placeholder}</Text>
      </Pressable>

      <Modal visible={iosOpen} transparent animationType="slide">
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <DateTimePicker
              value={iosTemp}
              mode="date"
              display="inline"
              onChange={(_e, d) => d && setIosTemp(d)}
            />
            <Pressable
              style={styles.doneBtn}
              onPress={() => {
                onChange(stripTime(iosTemp));
                setIosOpen(false);
              }}
            >
              <Text style={styles.doneText}>Done</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: 'white',
  },
  text: { color: '#111' },
  placeholder: { color: '#999' },
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { backgroundColor: 'white', padding: 16, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  doneBtn: { backgroundColor: '#1a73e8', borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 8 },
  doneText: { color: 'white', fontWeight: '700', fontSize: 16 },
});