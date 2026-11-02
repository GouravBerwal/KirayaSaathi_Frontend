from django.urls import path
from . import views

urlpatterns = [
    path('', views.dashboard, name="dashboard"),
    path('property-list/', views.property_list, name="property_list"),
    path('rooms/', views.rooms, name="rooms"),
    path('tenants/', views.tenants, name="tenants"),
    path('property-detail/', views.property_detail, name="property-detail"),
    path('add-property/', views.add_property, name="add-property"),
    path('edit-property/', views.edit_property, name="edit_property"),
    path('tenant-profile/', views.tenant_profile, name="tenant_profile"),
    path('rent-management/', views.rent_management, name="rent_management"),
    path('electricity-bill-form/', views.electricity_bill_form, name="electricity_bill_form"),
    path('invoice-list/', views.invoice_list, name="invoice_list"),
    path('reports/', views.reports, name="reports"),
    path('tenant-detail/', views.tenant_detail, name="tenant_detail"),
    path('electricity-bill-list/', views.electricity_bill_list, name="electricity_bill_list"),
    path('property-filter/', views.property_filter, name="property_filter"),
    path('add-room/', views.add_room, name="add_room"),
    path('notifications/', views.notifications, name="notifications"),
    path('settings/', views.settings, name="settings")
]