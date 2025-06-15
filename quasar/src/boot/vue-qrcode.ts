import { boot } from 'quasar/wrappers';
import VueQrcode from '@chenfengyuan/vue-qrcode';

export default boot(({ app }) => {
    app.component('vue-qrcode', VueQrcode);
});