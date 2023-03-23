import { GetterTree } from 'vuex'
import UtilState from './UtilState'
import RootState from '@/store/RootState'

const getters: GetterTree <UtilState, RootState> = {
  getViewSize(state) {
    return state.viewSize;
  },
  getRejectReasons(state) {
    return state.rejectReasons ? state.rejectReasons : []
  }
}
export default getters;