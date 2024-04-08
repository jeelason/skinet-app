import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { BasketService } from 'src/app/basket/basket.service';
import { CheckoutService } from '../checkout.service';
import { ToastrService } from 'ngx-toastr';
import { Basket } from 'src/app/shared/models/baskets';
import { Address } from 'src/app/shared/user';
import { NavigationExtras, Router } from '@angular/router';
import { loadStripe, Stripe, StripeCardCvcElement, StripeCardExpiryElement, StripeCardNumberElement } from '@stripe/stripe-js';
import { firstValueFrom } from 'rxjs';
import { OrderToCreate } from 'src/app/shared/models/order';

@Component({
  selector: 'app-checkout-payment',
  templateUrl: './checkout-payment.component.html',
  styleUrls: ['./checkout-payment.component.scss']
})
export class CheckoutPaymentComponent implements OnInit {
  @Input() checkoutForm?: FormGroup;
  @ViewChild('cardNumber') cardNumberElement?: ElementRef;
  @ViewChild('cardExpiry') cardExpiryElement?: ElementRef;
  @ViewChild('cardCvc') cardCvcElement?: ElementRef;
  stripe: Stripe | null = null;
  cardNumber?: StripeCardNumberElement;
  cardExpiry?: StripeCardExpiryElement;
  cardCvc?: StripeCardCvcElement;
  cardNumberComplete = false;
  cardExpiryComplete = false;
  cardCvcComplete = false;
  cardErrors: any;
  stripeTestKey: string = 'pk_test_51P20omK2vuGvZ84FKVitm74UmND871SDmuNc5YxaHI6rezLfcGtCnOcnKeIGZuLNVE4OTNEEMbPdbpiHuTwQrVug00V53UGVz4';
  loading = false;

  constructor(private basketService: BasketService, private checkoutService: CheckoutService,
    private toastr: ToastrService, private router: Router) {}

  ngOnInit(): void {
    loadStripe(this.stripeTestKey).then(stripe => {
      this.stripe = stripe;
      const elements = stripe?.elements();
      if (elements) {
        this.cardNumber = elements.create('cardNumber');
        this.cardNumber.mount(this.cardNumberElement?.nativeElement);
        this.cardNumber.on('change', event => {
          this.cardNumberComplete = event.complete;
          if (event.error) this.cardErrors = event.error.message;
          else this.cardErrors = null;
        })

        this.cardExpiry = elements.create('cardExpiry');
        this.cardExpiry.mount(this.cardExpiryElement?.nativeElement);
        this.cardExpiry.on('change', event => {
          this.cardExpiryComplete = event.complete;
          if (event.error) this.cardErrors = event.error.message;
          else this.cardErrors = null;
        })

        this.cardCvc = elements.create('cardCvc');
        this.cardCvc.mount(this.cardCvcElement?.nativeElement);
        this.cardCvc.on('change', event => {
          this.cardCvcComplete = event.complete;
          if (event.error) this.cardErrors = event.error.message;
          else this.cardErrors = null;
        })

        this.cardExpiry = elements.create('cardExpiry');
        this.cardExpiry.mount(this.cardExpiryElement?.nativeElement);

        this.cardCvc = elements.create('cardCvc');
        this.cardCvc.mount(this.cardCvcElement?.nativeElement);
      }
    })
  }

  get paymentFormComplete() {
    return this.checkoutForm?.get('paymentForm')?.valid 
    && this.cardNumberComplete
    && this.cardExpiryComplete
    && this.cardCvcComplete
  }

  async submitOrder() {    
    this.loading = true;
    const basket = this.basketService.getCurrentBasketValue();
    if (!basket) throw new Error('Cannot get basket');
    try {
      const createdOrder = await this.createOrder(basket);
      const paymentResult = await this.confirmPaymentWithStripe(basket);
      if (paymentResult.paymentIntent) {
        this.basketService.deleteBasket(basket);        
        const navigationExtras: NavigationExtras = {state: createdOrder};
        this.router.navigate(['checkout/success'], navigationExtras);
      } else {
        this.toastr.error(paymentResult.error.message);
      }
    } catch (error: any) {
      console.log(error);
      this.toastr.error(error.message);
    } finally {
      this.loading = false;
    }
  }

  private async confirmPaymentWithStripe(basket: Basket | null) {
    if(!basket) throw new Error('Basket is null');
    const result = this.stripe?.confirmCardPayment(basket.clientSecret!, {
          payment_method: {
            card: this.cardNumber!,
            billing_details: {
              name: this.checkoutForm?.get('paymentForm')?.get('nameOnCard')?.value
            }
          }
        });
        if (!result) throw new Error('Problem attempting payment with Stripe');
        return result;
  }
  
  private async createOrder(basket: Basket | null) {
    if(!basket) throw new Error('Basket is null');
    const orderToCreate = this.getOrderToCreate(basket);
    return firstValueFrom(this.checkoutService.createOrder(orderToCreate))
  }

  private getOrderToCreate(basket: Basket) : OrderToCreate {
    const deliveryMethodId = this.checkoutForm?.get('deliveryForm')?.get('deliveryMethod')?.value;
    const shipToAddress = this.checkoutForm?.get('addressForm')?.value as Address;
    if (!deliveryMethodId || !shipToAddress) throw new Error('Problem with basket'); //purely for TS happiness
    return {
      basketId: basket.id,
      deliveryMethodId: deliveryMethodId,
      shipToAddress: shipToAddress
    }
  }
}