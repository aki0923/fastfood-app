'use client';

import React, { useState, useEffect } from 'react';

export default function FrydayApp() {
  const N8N_WEBHOOK_URL = "https://fryday11.app.n8n.cloud/webhook/order";

  const [cart, setCart] = useState<Array<{ title: string; price: number; details: string[] }>>([]);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isCartModalOpen, setIsCartModalOpen] = useState(false);

  const [currentModalItem, setCurrentModalItem] = useState({ name: '', basePrice: 0 });
  const [selectedSauces, setSelectedSauces] = useState<Record<string, { value: string; price: number }>>({});
  const [selectedToppings, setSelectedToppings] = useState<Record<string, { value: string; price: number }>>({});
  const [selectedDrinks, setSelectedDrinks] = useState<Record<string, { value: string; price: number }>>({});

  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bumpCart, setBumpCart] = useState(false);

  useEffect(() => {
    // Интеграция с Telegram WebApp
    if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp) {
      const tg = (window as any).Telegram.WebApp;
      tg.ready();
      tg.expand();
      if (tg.initDataUnsafe?.user) {
        const u = tg.initDataUnsafe.user;
        setCustName([u.first_name, u.last_name].filter(Boolean).join(" "));
      }
    }
  }, []);

  const triggerHaptic = () => {
    if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.HapticFeedback) {
      (window as any).Telegram.WebApp.HapticFeedback.impactOccurred('light');
    }
  };

  const scrollToSection = (id: string) => {
    triggerHaptic();
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const openProductModal = (name: string, basePrice: number) => {
    triggerHaptic();
    setCurrentModalItem({ name, basePrice });
    setSelectedSauces({});
    setSelectedToppings({});
    setSelectedDrinks({});
    setIsProductModalOpen(true);
    document.body.classList.add('modal-open');
  };

  const closeProductModal = () => {
    triggerHaptic();
    setIsProductModalOpen(false);
    if (!isCartModalOpen) document.body.classList.remove('modal-open');
  };

  const addDirectItem = (name: string, price: number) => {
    triggerHaptic();
    setCart(prev => [...prev, { title: name, price: price, details: [] }]);
    triggerCartBump();
  };

  const triggerCartBump = () => {
    setBumpCart(false);
    setTimeout(() => setBumpCart(true), 10);
  };

  const calculateLiveTotal = () => {
    let sum = currentModalItem.basePrice;
    Object.values(selectedSauces).forEach(i => sum += i.price);
    Object.values(selectedToppings).forEach(i => sum += i.price);
    Object.values(selectedDrinks).forEach(i => sum += i.price);
    return sum;
  };

  const toggleOption = (state: Record<string, any>, setState: any, key: string, value: string, price: number) => {
    triggerHaptic();
    setState((prev: any) => {
      const next = { ...prev };
      if (next[key]) {
        delete next[key];
      } else {
        next[key] = { value, price };
      }
      return next;
    });
  };

  const confirmAddItem = () => {
    triggerHaptic();
    let extraPrice = 0;
    let details: string[] = [];

    Object.values(selectedSauces).forEach(i => { extraPrice += i.price; details.push(i.value); });
    Object.values(selectedToppings).forEach(i => { extraPrice += i.price; details.push(i.value); });

    const drinkItems: Array<{ title: string; price: number; details: string[] }> = [];
    Object.values(selectedDrinks).forEach(i => {
      drinkItems.push({ title: i.value, price: i.price, details: [] });
    });

    const totalItemPrice = currentModalItem.basePrice + extraPrice;
    const mainItem = {
      title: currentModalItem.name,
      price: totalItemPrice,
      details: details
    };

    setCart(prev => [...prev, ...drinkItems, mainItem]);
    setIsProductModalOpen(false);
    if (!isCartModalOpen) document.body.classList.remove('modal-open');
    triggerCartBump();
  };

  const removeFromCart = (index: number) => {
    triggerHaptic();
    setCart(prev => prev.filter((_, i) => i !== index));
  };

  const openCart = () => {
    if (cart.length === 0) return;
    triggerHaptic();
    setIsCartModalOpen(true);
    document.body.classList.add('modal-open');
  };

  const closeCart = () => {
    triggerHaptic();
    setIsCartModalOpen(false);
    document.body.classList.remove('modal-open');
  };

  const submitFinalOrder = async () => {
    triggerHaptic();
    if (!custName.trim() || !custPhone.trim()) {
      const tg = (window as any).Telegram?.WebApp;
      if (tg?.showAlert) tg.showAlert("Пожалуйста, укажите Имя и Телефон.");
      else alert("Пожалуйста, укажите Имя и Телефон.");
      return;
    }

    const total = cart.reduce((sum, i) => sum + i.price, 0);
    const tg = (window as any).Telegram?.WebApp;
    const telegramId = tg?.initDataUnsafe?.user ? tg.initDataUnsafe.user.id : 0;

    const payload = {
      telegram_id: telegramId,
      name: custName,
      phone: custPhone,
      cart: cart,
      total_price: total
    };

    setIsSubmitting(true);

    try {
      const res = await fetch(N8N_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        if (tg?.close) tg.close();
        else alert("Заказ успешно отправлен!");
      } else {
        alert("Ошибка отправки. Попробуйте еще раз.");
        setIsSubmitting(false);
      }
    } catch (err) {
      alert("Ошибка сети.");
      setIsSubmitting(false);
    }
  };

  const cartTotal = cart.reduce((sum, i) => sum + i.price, 0);

  return (
    <>
      <header className="brand-header">
        <div className="brand-row">
          <img src="/fryday logo.jpg" alt="Fryday Logo" className="brand-logo" />
          <div className="brand-info">
            <h1>Fryday <span>Express</span></h1>
            <p>Голландский фри &amp; хот-доги</p>
          </div>
          <div className="status-pill" role="status">
            <span className="live-dot" aria-hidden="true"></span>
            Открыто
          </div>
        </div>

        <div className="info-strip" aria-label="Информация о заказе">
          <span className="info-chip">Быстрый предзаказ</span>
          <span className="info-chip">Готово за 10–15 мин</span>
          <span className="info-chip">Самовывоз</span>
        </div>

        <nav className="category-tabs" aria-label="Категории меню">
          <button className="tab-chip active" onClick={() => scrollToSection('section-main')}>
            Основные блюда
          </button>
          <button className="tab-chip" onClick={() => scrollToSection('section-drinks')}>
            Напитки
          </button>
        </nav>
      </header>

      <main style={{ paddingBottom: '120px' }}>
        <section className="menu-section" id="section-main">
          <h2 className="category-title">
            <span className="category-icon">🍟</span>
            Основные блюда
            <span className="category-count">2 позиции</span>
          </h2>
          <div className="menu-grid">
            <div className="menu-card" onClick={() => openProductModal('Картофель Фри (Dutch Fries)', 180)}>
              <div className="menu-card-media">
                <img src="/fries.png" alt="Картофель Фри" className="menu-card-img" />
                <span className="badge yellow">Хит</span>
              </div>
              <div className="menu-card-info">
                <h3>Картофель Фри (Dutch Fries)</h3>
                <span className="price">180<small>KGS</small></span>
              </div>
              <button className="add-btn" aria-label="Добавить Картофель Фри">+</button>
            </div>

            <div className="menu-card" onClick={() => openProductModal('Хот-дог в булочке Бриошь', 240)}>
              <div className="menu-card-media">
                <img src="/hotdog.png" alt="Хот-дог" className="menu-card-img" />
                <span className="badge">Новинка</span>
              </div>
              <div className="menu-card-info">
                <h3>Хот-дог в булочке Бриошь</h3>
                <span className="price">240<small>KGS</small></span>
              </div>
              <button className="add-btn" aria-label="Добавить Хот-дог">+</button>
            </div>
          </div>
        </section>

        <section className="menu-section" id="section-drinks">
          <h2 className="category-title">
            <span className="category-icon">🥤</span>
            Напитки
            <span className="category-count">3 позиции</span>
          </h2>
          <div className="menu-grid">
            <div className="menu-card" onClick={() => addDirectItem('Coca-Cola 0.5л', 90)}>
              <div className="drink-media cola"><div className="drink-can"><span>COLA</span></div></div>
              <div className="menu-card-info">
                <h3>Coca-Cola 0.5л</h3>
                <span className="price">90<small>KGS</small></span>
              </div>
              <button className="add-btn" aria-label="Добавить Coca-Cola">+</button>
            </div>

            <div className="menu-card" onClick={() => addDirectItem('Fanta 0.5л', 90)}>
              <div className="drink-media fanta"><div className="drink-can"><span>FANTA</span></div></div>
              <div className="menu-card-info">
                <h3>Fanta 0.5л</h3>
                <span className="price">90<small>KGS</small></span>
              </div>
              <button className="add-btn" aria-label="Добавить Fanta">+</button>
            </div>

            <div className="menu-card" onClick={() => addDirectItem('Sprite 0.5л', 90)}>
              <div className="drink-media sprite"><div className="drink-can"><span>SPRITE</span></div></div>
              <div className="menu-card-info">
                <h3>Sprite 0.5л</h3>
                <span className="price">90<small>KGS</small></span>
              </div>
              <button className="add-btn" aria-label="Добавить Sprite">+</button>
            </div>
          </div>
        </section>
      </main>

      {/* Мобильное модальное окно товара */}
      {isProductModalOpen && (
        <div className="modal-overlay active" onClick={(e) => { if (e.target === e.currentTarget) closeProductModal(); }}>
          <div className="modal-content has-footer">
            <div className="modal-drag-handle" onClick={closeProductModal}></div>
            <div className="modal-header">
              <div>
                <h3>{currentModalItem.name}</h3>
                <p className="modal-subtitle">Соберите заказ по своему вкусу</p>
              </div>
              <button className="close-btn" onClick={closeProductModal}>✕</button>
            </div>

            <div className="option-group">
              <div className="option-group-head"><h4>Соусы</h4><span className="option-hint">Можно несколько</span></div>
              <div className="chip-list">
                {[
                  { id: 's1', val: 'Сырный соус', price: 40 },
                  { id: 's2', val: 'Трюфельный соус', price: 60 },
                  { id: 's3', val: 'BBQ соус', price: 40 },
                  { id: 's4', val: 'Чили соус', price: 40 },
                  { id: 's5', val: 'Майонез', price: 30 },
                  { id: 's6', val: 'Кетчуп', price: 30 },
                  { id: 's7', val: 'Чесночный соус', price: 40 },
                ].map(item => (
                  <label key={item.id} className={`option-item ${selectedSauces[item.id] ? 'checked' : ''}`} onClick={() => toggleOption(selectedSauces, setSelectedSauces, item.id, item.val, item.price)}>
                    <input type="checkbox" checked={!!selectedSauces[item.id]} readOnly />
                    <span className="chip-check">✓</span>
                    <span className="chip-label">{item.val}</span>
                    <span className="option-price">+{item.price}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="option-group">
              <div className="option-group-head"><h4>Топпинги</h4><span className="option-hint">Можно несколько</span></div>
              <div className="chip-list">
                {[
                  { id: 't1', val: 'Сыр Пармезан', price: 50 },
                  { id: 't2', val: 'Хрустящий лук', price: 30 },
                  { id: 't3', val: 'Халапеньо', price: 30 },
                  { id: 't4', val: 'Маринованные огурцы', price: 30 },
                  { id: 't5', val: 'Зеленый лук', price: 20 },
                ].map(item => (
                  <label key={item.id} className={`option-item ${selectedToppings[item.id] ? 'checked' : ''}`} onClick={() => toggleOption(selectedToppings, setSelectedToppings, item.id, item.val, item.price)}>
                    <input type="checkbox" checked={!!selectedToppings[item.id]} readOnly />
                    <span className="chip-check">✓</span>
                    <span className="chip-label">{item.val}</span>
                    <span className="option-price">+{item.price}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="option-group">
              <div className="option-group-head"><h4>Добавить напиток</h4><span className="option-hint">0.5 л</span></div>
              <div className="chip-list">
                {[
                  { id: 'd1', val: 'Coca-Cola 0.5л', price: 90 },
                  { id: 'd2', val: 'Fanta 0.5л', price: 90 },
                  { id: 'd3', val: 'Sprite 0.5л', price: 90 },
                ].map(item => (
                  <label key={item.id} className={`option-item ${selectedDrinks[item.id] ? 'checked' : ''}`} onClick={() => toggleOption(selectedDrinks, setSelectedDrinks, item.id, item.val, item.price)}>
                    <input type="checkbox" checked={!!selectedDrinks[item.id]} readOnly />
                    <span className="chip-check">✓</span>
                    <span className="chip-label">{item.val}</span>
                    <span className="option-price">+{item.price}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="sheet-footer">
              <button className="submit-order-btn" onClick={confirmAddItem}>
                <span>Добавить в корзину</span>
                <span className="btn-total">{calculateLiveTotal()} KGS</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно корзины */}
      {isCartModalOpen && (
        <div className="modal-overlay active" onClick={(e) => { if (e.target === e.currentTarget) closeCart(); }}>
          <div className="modal-content">
            <div className="modal-drag-handle" onClick={closeCart}></div>
            <div className="modal-header">
              <div>
                <h3>Ваш заказ</h3>
                <p className="modal-subtitle">Проверьте позиции перед оформлением</p>
              </div>
              <button className="close-btn" onClick={closeCart}>✕</button>
            </div>

            <div id="cart-items-list" style={{ background: 'var(--bg-color)', borderRadius: '16px', padding: '4px 14px', marginBottom: '16px' }}>
              {cart.map((item, index) => (
                <div key={index} className="cart-item-row">
                  <div>
                    <strong>{item.title}</strong>
                    {item.details.length > 0 && (
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '3px', fontWeight: 600 }}>
                        {item.details.join(', ')}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                    <span style={{ fontWeight: 800 }}>{item.price} KGS</span>
                    <span className="cart-item-remove" onClick={() => removeFromCart(index)}>✕</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="cart-summary">
              <span>Итого к оплате</span>
              <span>{cartTotal} KGS</span>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label className="form-label">Имя</label>
              <input type="text" value={custName} onChange={(e) => setCustName(e.target.value)} className="input-field" placeholder="Ваше Имя" />
              <label className="form-label">Телефон</label>
              <input type="tel" value={custPhone} onChange={(e) => setCustPhone(e.target.value)} className="input-field" placeholder="Номер телефона" />
            </div>

            <button className="submit-order-btn centered" onClick={submitFinalOrder} disabled={isSubmitting}>
              {isSubmitting ? "Отправка..." : "Оформить заказ"}
            </button>
          </div>
        </div>
      )}

      {/* Плавающая панель корзины */}
      {cart.length > 0 && (
        <div className={`cart-bar ${bumpCart ? 'bump' : ''}`} onClick={openCart}>
          <div className="cart-bar-left">
            <span className="cart-icon-wrap">🛒</span>
            <div className="cart-bar-text">
              <span className="cart-bar-kicker">Корзина</span>
              <span className="cart-bar-title">{cart.length} поз. в корзине</span>
            </div>
          </div>
          <span className="cart-bar-btn">
            <span>{cartTotal} KGS</span>
          </span>
        </div>
      )}
    </>
  );
}