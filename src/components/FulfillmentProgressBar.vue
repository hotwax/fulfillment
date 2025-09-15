<template>
  <div class="order-status-bar">
    <Bar :data="chartData" :options="chartOptions" />
  </div>
</template>

<script setup>
import { Bar } from 'vue-chartjs'
import { Chart as ChartJS, BarElement, CategoryScale, LinearScale, Tooltip } from 'chart.js'
import { computed, defineProps } from 'vue'

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip)

const props = defineProps({
  dataSegments: {
    type: Object,
    required: true,
  },
  total: {
    type: Number,
    required: true,
  },
})

const chartData = computed(() => {
  const entries = Object.entries(props.dataSegments)

  let usedCount = 0
  // const datasets = entries.map(([label, { value, color }]) => {
  //   usedCount += value
  //   return {
  //     label,
  //     data: [value],
  //     backgroundColor: color
  //   }
  // })
  const datasets = entries.map(([label, { value, color }], index, arr) => {
    usedCount += value

    const isFirst = index === 0
    const isLast = index === arr.length - 1 && props.total - usedCount <= 0
    console.log('index :', index);
    console.log('arr.length :', arr.length);
    console.log('isLast :', isLast);

    return {
      label,
      data: [value],
      backgroundColor: color,
      borderColor: '#ccc',
      borderWidth: 1,
      borderSkipped: false,
      borderRadius: isFirst || isLast ? 16 : 0,
    }
  })


  const remainingValue = Math.max(props.total - usedCount, 0)

  if (remainingValue > 0) {
    datasets.push({
      label: 'Remaining',
      data: [remainingValue],
      backgroundColor: '#FFFFFF',
      borderColor: 'black',
      borderWidth: 1,
      borderRadius: {
        topRight: 16,
        bottomRight: 16,
      },
    })
  }

  return {
    labels: ['Orders'],
    datasets,
  }
})

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  indexAxis: 'y',
  scales: {
    x: {
      stacked: true,
      display: false,
      max: props.total,
      borderRadius: 10
    },
    y: {
      stacked: true,
      display: false,
    },
  },
  plugins: {
    tooltip: {
      enabled: true,
      callbacks: {
        label: context => `${context.dataset.label}: ${context.raw}`,
      },
    },
  },
}
</script>

<style scoped>
.order-status-bar {
  height: 68px;
  align-self: center;
}
</style>
