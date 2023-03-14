import { GetterTree } from 'vuex'
import UtilState from './UtilState'
import RootState from '@/store/RootState'

const getters: GetterTree<UtilState, RootState> = {
  getViewSize(state) {
    return state.viewSize;
  }
}
export default getters;