<template>
    <ion-page>
        <ion-header>
            <ion-toolbar>
                <ion-buttons>
                    <ion-button slot="start">
                        <ion-menu-button></ion-menu-button>
                    </ion-button>
                </ion-buttons> 
                <ion-label> {{ $t('10 of 26 orders') }} </ion-label>
                <ion-buttons slot="end">
                    <ion-button>
                        <ion-icon :icon="options" />
                    </ion-button>
                </ion-buttons>
            </ion-toolbar>
        </ion-header>

        <ion-content :fullscreen="true">

            <ion-fab vertical="bottom" horizontal="end"> 
                <ion-fab-button>
                    <ion-icon :icon="print" />
                </ion-fab-button>
            </ion-fab>

            <ion-searchbar placeholder="Search orders" />

            <div class="filters">
                <ion-item class="filter" lines="none">
                    <ion-checkbox slot="start" />
                    <ion-label>
                        {{ $t('Same Day') }}
                        <p> {{ $t('37 orders, 40 items') }} </p>
                    </ion-label>
                </ion-item>
                <ion-item class="filter" lines="none">
                    <ion-checkbox slot="start" />
                    <ion-label>
                        {{ $t('Same Day') }}
                        <p> {{ $t('37 orders, 40 items') }} </p>
                    </ion-label>
                </ion-item>
                <ion-item class="filter" lines="none">
                    <ion-checkbox slot="start" />
                    <ion-label>
                        {{ $t('Same Day') }}
                        <p> {{ $t('37 orders, 40 items') }} </p>
                    </ion-label>
                </ion-item>
            </div>

            <ion-button expand="block" fill="outline" size="large"> {{ $t('print picksheet') }} </ion-button>

            <ion-card>
                <div class="card-header">
                    <div class="tags">
                        <ion-chip outline="true">
                            <ion-icon :icon="pricetag" />
                            <ion-label> {{ $t('NN10584') }} </ion-label>
                        </ion-chip>
                    </div>
                    <div class="m-actions">
                        <ion-button slot="ion-only" fill="clear">
                            <ion-icon :icon="refresh-circle" />
                        </ion-button>
                    </div>
                    <div class="customer">
                        <ion-item lines="none">
                            <ion-label>
                                {{ $t('Dorothy Magwood') }}
                                <p> {{ $t('ordered 27th january 2020 9:24 PM EST') }}</p>
                            </ion-label>
                        </ion-item>
                    </div>
                    <div class="sla">
                        <ion-item lines="none">
                            <ion-label >
                                {{ $t('Next day shipping') }}
                                <p> {{ $t('last brokered 28 january 2020 2:30 PM EST') }} </p>
                            </ion-label>
                        </ion-item>
                    </div>
                </div>

                <div class="shipment-items">
                    <ion-item>
                        <ion-thumbnail slot="start">
                            <Image :src="'assets/images/hc.png'" />
                        </ion-thumbnail>
                        <ion-label>
                            <p>{{ $t('WJ06-XL-PURPLE') }}</p>
                            {{ $t('Juno Jacket') }}
                            <p>{{ $t('BLUE XL') }}</p>
                        </ion-label>
                        <ion-note slot="end"> {{ $t('49 pieces in stock') }} </ion-note>
                    </ion-item>
                </div>

                <div class="actions">
                    <ion-button color="danger" fill="outline">
                        {{ $t('Recycle') }}
                    </ion-button>
                </div>
            </ion-card>
        </ion-content>
    </ion-page>
</template>

<script lang="ts">
import { IonButton, IonButtons, IonCard, IonContent, IonHeader, IonIcon, IonLabel, IonMenuButton, IonPage, IonSearchbar, IonThumbnail, IonToolbar } from "@ionic/vue";
import { options, print, pricetag, refresh-circle } from "ionicons/icons";
import Image from "@/components/Image.vue";
import { defineComponent } from "vue"
export default defineComponent({
  name: "Orders",
  components: {
    Image,
    IonButton,
    IonButtons,
    IonCard,
    IonContent,
    IonHeader,
    IonIcon,
    IonLabel,
    IonMenuButton,
    IonPage,
    IonSearchbar,
    IonThumbnail,
    IonToolbar,
  },
  setup(){
      return{
          options, print, pricetag, refresh-circle
      }
  }
});
</script>

<style scoped>
.filters{
    display: flex;
    overflow-x: scroll;
}
.filter{
    border: 1px solid #9D9FA6;
    margin: 0px 0px 0px 8px;
}
.card-header{
    display: grid;
    grid:"tags m-actions"
         "customer customer"
         "sla sla"
         / auto;
}
.tags{
    grid-area: tags;
}
.m-actions{
    grid-area: m-actions;
}
.customer{
    grid-area: customer;
}
.sla{
    grid-area: sla;
}
.actions{
    display: none;
}

@media(min-width: 991px){
    .card-header{
        grid:"customer tags sla" / max-content 1fr max-content;
        padding-right: 16px;
        border-bottom: 1px solid var(--ion-color-medium);
    }
    .m-actions{
        display: none;
    }
    .actions{
        display:flex;
        border-top: 1px solid var(--ion-color-medium);
    }
    ion-fab{
        display: none;
    }
}
</style>