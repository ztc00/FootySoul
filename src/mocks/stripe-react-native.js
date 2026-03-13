// Web stub for @stripe/stripe-react-native — native module not available on web
const { View } = require('react-native');
const React = require('react');

const StripeProvider = ({ children }) => children;
const initStripe = async () => {};
const useStripe = () => ({
  confirmPayment: async () => ({ error: new Error('Stripe not available on web') }),
  createPaymentMethod: async () => ({ error: new Error('Stripe not available on web') }),
  presentPaymentSheet: async () => ({ error: new Error('Stripe not available on web') }),
  initPaymentSheet: async () => ({ error: new Error('Stripe not available on web') }),
  confirmPaymentSheetPayment: async () => ({ error: new Error('Stripe not available on web') }),
});

module.exports = { StripeProvider, initStripe, useStripe };
