import { TextToSpeech } from '@capacitor-community/text-to-speech';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

window.AndroidNative = {
  async speak(text) {
    try {
      await TextToSpeech.stop().catch(() => {});
      await TextToSpeech.speak({
        text,
        lang: 'en-US',
        rate: 0.82,
        pitch: 1.0,
        volume: 1.0,
        queueStrategy: 0
      });
      return true;
    } catch (error) {
      console.error('Android TTS error', error);
      try { await TextToSpeech.openInstall(); } catch (_) {}
      return false;
    }
  },

  async exportBackup(contents, filename) {
    const result = await Filesystem.writeFile({
      path: filename,
      data: contents,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
      recursive: true
    });
    const canShare = await Share.canShare();
    if (!canShare.value) return false;
    await Share.share({
      title: 'Backup Inglés Sebas',
      dialogTitle: 'Guardar o compartir backup',
      files: [result.uri]
    });
    return true;
  }
};
