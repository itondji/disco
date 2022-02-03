<template>
  <div>
    <vee-field
      as="select"
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
      v-slot="{ value }"
      multiple
    >
      <option
        v-for="option in field.options"
        :key="option"
        :value="option"
        :selected="value && value.includes(option)"
      >
        {{ option }}
      </option>
    </vee-field>
  </div>
</template>

<script>
export default {
  name: 'custom-select-multiple',
  props: ['field'],
};
</script>
