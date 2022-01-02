<template>
  <training-frame
    :Id="Id"
    :task="task"
    :nbrClasses="this.task.trainingInformation.LABEL_LIST.length"
    :helper="helper"
  >
    <template v-slot:dataExample>
      <!-- Data Point Example -->
      <div class="flex object-center">
        <img
          class="object-center"
          :src="getImage(dataExampleImage)"
          v-bind:alt="dataExampleImage"
        /><img />
      </div>
    </template>
    <template v-slot:extra></template>
  </training-frame>
</template>

<script>
import { ImageTaskHelper } from '../../../helpers/task_definition/image/helper';
import TrainingFrame from '../containers/TrainingFrame.vue';

export default {
  name: 'image-training-frame',
  props: {
    Id: String,
    task: Object,
  },
  components: {
    TrainingFrame,
  },
  data() {
    return {
      // variables for general informations
      dataExampleImage: this.task.displayInformation.dataExampleImage,
      dataExample: this.task.displayInformation.dataExample,
      helper: new ImageTaskHelper(this.task),
    };
  },
  methods: {
    getImage(url) {
      if (url == '') {
        return null;
      }
      var images = require.context('../../../../example_training_data/', false);
      return images(url);
    },
  },
};
</script>
