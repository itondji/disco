<template>
  <div>
    <vee-field
      v-bind:name="field.id"
      v-bind:id="field.id"
      class="
        bg-transparent
        border-b
        m-auto
        block
        focus:outline-none focus:border-green-500
        w-full
        mb-6
        text-gray-700
        dark:text-gray-100
        pb-1
      "
      v-bind:as="field.as ? field.as : field.type"
      v-bind:type="field.type"
      v-bind:placeholder="field.default"
      v-bind:rows="
        field.as === 'textarea' ? (field.type === 'number' ? 1 : 6) : undefined
      "
      v-bind:value="field.type === 'checkbox' ? field.default : undefined"
      v-bind:step="
        field.type === 'number' && field.as === 'textarea' ? 'any' : undefined
      "
    />
  </div>
</template>

<script>
import { Field as VeeField, ErrorMessage } from 'vee-validate';
export default {
  name: 'custom-field',
  props: ['field'],
  components: {
    VeeField,
  },
};
</script>
