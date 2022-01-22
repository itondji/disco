<template>
  <action-frame :task="task">
    <template v-slot:dataExample><slot name="dataExample"></slot></template>
    <template v-slot:action>
      <!-- Upload Training Data -->
      <div class="relative">
        <uploading-frame
          v-bind:Id="Id"
          v-bind:task="task"
          v-bind:fileUploadManager="trainer.fileUploadManager"
          v-if="trainer.fileUploadManager"
        />
      </div>

      <slot name="extra"></slot>

      <!-- Train Button -->
      <div class="flex items-center justify-center p-4">
        <div v-if="!isTraining">
          <custom-button v-on:click="joinTraining(false)" :center="true">
            Train Locally
          </custom-button>
          <custom-button v-on:click="joinTraining(true)" :center="true">
            Train {{ this.$t('platform') }}
          </custom-button>
        </div>
        <div v-else>
          <custom-button
            v-on:click="stopTraining()"
            :center="true"
            color="bg-red-500"
          >
            Stop {{ trainingText }} Training
          </custom-button>
        </div>
      </div>
      <!-- Training Board -->
      <div>
        <training-information-frame
          v-bind:trainingInformant="trainer.trainingInformant"
          v-if="trainer.trainingInformant"
        />
      </div>

      <!-- Save the model button -->
      <icon-card
        header="Save the model"
        description="If you are satisifed with the performance of the model, don't
            forget to save the model by clicking on the button below. The next
            time you will load the application, you will be able to use your
            saved model."
      >
        <template v-slot:icon><download /></template>
        <template v-slot:extra
          ><div class="flex items-center justify-center p-4">
            <!-- make it gray & unclickable if indexeddb is turned off -->
            <custom-button
              id="train-model-button"
              v-on:click="saveModel()"
              :center="true"
            >
              Save My model
            </custom-button>
          </div></template
        >
      </icon-card>
      <!-- Test the model button -->
      <icon-card
        header="Test the model"
        description="Once you have finished training your model it might be a great idea
            to go test it."
      >
        <template v-slot:icon><download /></template>
        <template v-slot:extra>
          <!-- Descrition -->
          <div class="relative p-4 overflow-x-hidden">
            <span
              style="white-space: pre-line"
              class="text-sm text-gray-500 dark:text-light"
            >
            </span>
          </div>
          <div class="flex items-center justify-center p-4">
            <custom-button
              id="train-model-button"
              v-on:click="goToTesting()"
              :center="true"
            >
              Test the model
            </custom-button>
          </div>
        </template>
      </icon-card>
    </template>
  </action-frame>
</template>

<script>
import UploadingFrame from '../upload/UploadingFrame.vue';
import TrainingInformationFrame from '../TrainingInformationFrame.vue';
import ActionFrame from './ActionFrame.vue';
import IconCard from '../../containers/IconCard.vue';
import CustomButton from '../../simple/CustomButton.vue';
import Download from '../../../assets/svg/Download.vue';

import { mapState } from 'vuex';
import { memory } from '../../../helpers/memory/indexedb/memory.js';
import { Trainer } from '../../../helpers/training/trainer.js';

export default {
  name: 'TrainingFrame',
  props: {
    Id: String,
    task: Object,
    nbrClasses: Number,
    helper: Object,
  },
  components: {
    UploadingFrame,
    TrainingInformationFrame,
    ActionFrame,
    IconCard,
    CustomButton,
    Download,
  },
  data() {
    return {
      trainer: new Trainer(
        this.task,
        this.$store.getters.platform,
        this.useIndexedDB,
        this.$toast,
        this.helper
      ),
    };
  },
  computed: {
    ...mapState(['useIndexedDB']),
    trainingText() {
      return this.distributedTraining ? 'Distributed' : 'Local';
    },
  },
  watch: {
    useIndexedDB(newValue) {
      this.trainer.setIndexedDB(newValue);
    },
  },
  methods: {
    async connectClientToServer() {
      this.isConnected = await this.client.connect();
      if (this.isConnected) {
        this.$toast.success(
          'Succesfully connected to server. Distributed training available.'
        );
      } else {
        console.log('Error in connecting');
        this.$toast.error(
          'Failed to connect to server. Fallback to training alone.'
        );
      }
      setTimeout(this.$toast.clear, 30000);
    },
    goToTesting() {
      this.$router.push({
        path: 'testing',
      });
    },
    async stopTraining() {
      this.trainingManager.stopTraining();
      if (this.isConnected) {
        await this.client.disconnect();
        this.isConnected = false;
      }
      this.$toast.success('Training was successfully interrupted.');
      setTimeout(this.$toast.clear, 30000);
      this.isTraining = false;
    },
    async saveModel() {
      if (this.useIndexedDB) {
        await memory.saveWorkingModel(
          this.task.taskID,
          this.task.trainingInformation.modelID
        );
        this.$toast.success(
          `The current ${this.task.displayInformation.taskTitle} model has been saved.`
        );
      } else {
        this.$toast.error(
          'The model library is currently turned off. See settings for more information'
        );
      }
    },
  },
  async mounted() {
    // This method is called when the component is created
    this.$nextTick(() => this.trainer.connect(this.useIndexedDB));
  },
  async unmounted() {
    this.trainer.disconnect();
  },
};
</script>
