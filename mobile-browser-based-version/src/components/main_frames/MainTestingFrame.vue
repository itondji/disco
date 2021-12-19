<template>
  <!-- CSV tasks -->
  <!--TODO-->
  <!-- image tasks -->
  <image-testing-frame
    v-if="task.trainingInformation.dataType == 'image'"
    v-bind:Id="Id"
    v-bind:task="task"
  />
  <csv-testing-frame
    v-else-if="task.trainingInformation.dataType == 'csv'"
    v-bind:Id="Id"
    v-bind:task="task"
  />
</template>

<script>
import ImageTestingFrame from '../building_frames/image/ImageTestingFrame.vue';
import CsvTestingFrame from '../building_frames/csv/CsvTestingFrame.vue';
import * as task_config from '../../helpers/task_definition/task.config.js';
export default {
  name: 'main-testing-frame',
  props: {
    Id: String,
    task: Object,
  },
  components: {
    ImageTestingFrame,
    CsvTestingFrame,
  },
  async activated() {
    this.$emit('opened-testing');
  },
};
</script>
