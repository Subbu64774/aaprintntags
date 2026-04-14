package com.aaprint.order.service;

import com.aaprint.order.dto.OrderProductDTO;
import com.aaprint.order.entity.OrderProduct;
import com.aaprint.product.service.ProductService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class OrderProductService {

    private final ProductService productService;


    public OrderProductDTO convertToOrderProductDTO(OrderProduct orderProduct) {
        OrderProductDTO orderProductDTO = new OrderProductDTO();
        if (orderProduct.getProduct() != null) {
            orderProductDTO.setProductId(orderProduct.getProduct().getProductId());
            orderProductDTO.setProductName(orderProduct.getProduct().getProductName());
            orderProductDTO.setAdditionalWorks(orderProduct.getProduct().getAdditionalWorks());
        } else {
            orderProductDTO.setProductName(orderProduct.getDescription());
        }
        orderProductDTO.setQuantity(orderProduct.getQuantity());
        orderProductDTO.setPrice(orderProduct.getPrice());
        orderProductDTO.setSize(orderProduct.getSize());
        orderProductDTO.setDescription(orderProduct.getDescription());
        orderProductDTO.setCgst(orderProduct.getCgst());
        orderProductDTO.setSgst(orderProduct.getSgst());
        orderProductDTO.setIgst(orderProduct.getIgst());
        return orderProductDTO;
    }

    public OrderProduct convertToOrderProduct(OrderProductDTO orderProductDTO) {
        OrderProduct orderProduct = new OrderProduct();
        orderProduct.setProduct(productService.getProductEntityById(orderProductDTO.getProductId()));
        orderProduct.setQuantity(orderProductDTO.getQuantity());
        orderProduct.setPrice(orderProductDTO.getPrice());
        orderProduct.setSize(orderProductDTO.getSize());
        orderProduct.setDescription(orderProductDTO.getDescription());
        orderProduct.setCgst(orderProductDTO.getCgst());
        orderProduct.setSgst(orderProductDTO.getSgst());
        orderProduct.setIgst(orderProductDTO.getIgst());
        return orderProduct;
    }
}
