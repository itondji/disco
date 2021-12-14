<template>
  <!-- CSV tasks -->
  <csv-training-frame
    v-if="task.trainingInformation.dataType == 'csv'"
    v-bind:Id="Id"
    v-bind:task="task"
  />
  <!-- image tasks -->
  <image-training-frame
    v-else-if="task.trainingInformation.dataType == 'image'"
    v-bind:Id="Id"
    v-bind:task="task"
  />
</template>

<script>
import CsvTrainingFrame from '../building_frames/csv/CsvTrainingFrame.vue';
import ImageTrainingFrame from '../building_frames/image/ImageTrainingFrame.vue';

export default {
  name: 'main-training-frame',
  props: {
    Id: String,
    task: Object,
  },
  components: {
    CsvTrainingFrame,
    ImageTrainingFrame,
  },
};
</script>
