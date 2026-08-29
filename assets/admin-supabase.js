(function () {
  'use strict';

  const store = window.BoothStore;
  const ADMIN_EMAIL = 'k01027895490@gmail.com';
  let activeFilter = 'active';
  let toastTimer;
  const $ = selector => document.querySelector(selector);
  const escapeHtml = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);

  const labels = {
    payment_pending: '입금 확인', confirmed: '주문 접수', cooking: '조리 중',
    ready: '수령 가능', picked_up: '수령 완료', cancelled: '취소'
  };
  const nextAction = {
    payment_pending: { label: '입금 확인', next: 'confirmed' },
    confirmed: { label: '조리 시작', next: 'cooking' },
    cooking: { label: '수령 가능', next: 'ready' },
    ready: { label: '수령 완료', next: 'picked_up' }
  };

  function toast(message) {
    const element = $('#toast');
    element.textContent = message;
    element.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => element.classList.remove('show'), 2200);
  }

  function matchesFilter(order) {
    if (activeFilter === 'active') return ['payment_pending', 'confirmed', 'cooking', 'ready'].includes(order.status);
    if (activeFilter === 'done') return ['picked_up', 'cancelled'].includes(order.status);
    return order.status === activeFilter;
  }

  function elapsed(iso) {
    const minutes = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
    if (minutes < 1) return '방금';
    if (minutes < 60) return `${minutes}분 전`;
    return `${Math.floor(minutes / 60)}시간 전`;
  }

  function formatContact(value) {
    const digits = String(value || '').replace(/[^0-9]/g, '');
    if (digits.length === 11) return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
    if (digits.length === 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
    return '연락처 없음';
  }

  function renderMetrics(state) {
    const sales = state.orders
      .filter(order => ['confirmed', 'cooking', 'ready', 'picked_up'].includes(order.status))
      .reduce((total, order) => total + store.calculateOrderTotal(order, state), 0);
    $('#metric-sales').textContent = store.formatPrice(sales);
    $('#metric-payment').textContent = state.orders.filter(order => order.status === 'payment_pending').length;
    $('#metric-cooking').textContent = state.orders.filter(order => ['confirmed', 'cooking'].includes(order.status)).length;
    $('#metric-ready').textContent = state.orders.filter(order => order.status === 'ready').length;
    $('#metric-done').textContent = state.orders.filter(order => ['picked_up', 'cancelled'].includes(order.status)).length;
  }

  function itemSummary(order) {
    return (order.items || []).map(item => `${item.name || '삭제된 메뉴'} ${item.quantity}`).join(' · ');
  }

  function bindOrderActions() {
    document.querySelectorAll('[data-order][data-status]').forEach(button => {
      button.addEventListener('click', async () => {
        if (button.dataset.status === 'cancelled' && !window.confirm('이 주문을 취소할까요? 취소 후 완료·취소 탭에서 복구할 수 있습니다.')) return;
        button.disabled = true;
        try {
          const order = await store.updateOrderStatus(button.dataset.order, button.dataset.status);
          if (order) toast(`#${order.orderNumber} · ${labels[order.status]} 처리`);
        } catch (error) {
          toast(error.message);
        } finally {
          button.disabled = false;
        }
      });
    });
  }

  function renderOrders(state) {
    const orders = state.orders.filter(matchesFilter).sort((a, b) => {
      if (activeFilter === 'done') return new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt);
      return a.orderNumber - b.orderNumber;
    });
    if (!orders.length) {
      $('#admin-orders').innerHTML = '<div class="empty-state">이 상태의 주문이 없습니다.</div>';
      return;
    }
    $('#admin-orders').innerHTML = orders.map(order => {
      const action = nextAction[order.status];
      const restoreAction = order.status === 'cancelled'
        ? { label: '주문 복구', next: 'confirmed' }
        : order.status === 'picked_up' ? { label: '수령 취소', next: 'ready' } : null;
      const statusClass = order.status === 'ready' ? 'ready' : order.status === 'cooking' ? 'cooking' : '';
      return `<article class="admin-order">
        <div class="admin-order-number">#${order.orderNumber}</div>
        <div class="admin-order-detail"><strong>${escapeHtml(itemSummary(order))}</strong><small>${escapeHtml(order.payerName)} · ${escapeHtml(formatContact(order.contact))} · ${elapsed(order.createdAt)} · ${store.formatPrice(store.calculateOrderTotal(order, state))}</small></div>
        <span class="status-pill ${statusClass}">${labels[order.status]}</span>
        <div class="order-actions">
          ${action ? `<button class="next" type="button" data-order="${order.id}" data-status="${action.next}">${action.label}</button>` : ''}
          ${restoreAction ? `<button class="next" type="button" data-order="${order.id}" data-status="${restoreAction.next}">${restoreAction.label}</button>` : ''}
          ${!['picked_up', 'cancelled'].includes(order.status) ? `<button class="cancel" type="button" data-order="${order.id}" data-status="cancelled">취소</button>` : ''}
        </div>
      </article>`;
    }).join('');
    bindOrderActions();
  }

  function bindMenuActions() {
    document.querySelectorAll('[data-save-price]').forEach(button => {
      button.addEventListener('click', async () => {
        const id = button.dataset.savePrice;
        const input = document.querySelector(`[data-price="${id}"]`);
        button.disabled = true;
        try {
          const item = await store.updateMenuItem(id, { price: Number(input.value) });
          toast(`${item.name} · ${store.formatPrice(item.price)} 저장`);
        } catch (error) {
          toast(error.message);
        } finally {
          button.disabled = false;
        }
      });
    });

    document.querySelectorAll('[data-active]').forEach(button => {
      button.addEventListener('click', async () => {
        const id = button.dataset.active;
        const item = store.getState().menu.find(menuItem => menuItem.id === id);
        const input = document.querySelector(`[data-price="${id}"]`);
        button.disabled = true;
        try {
          const updated = await store.updateMenuItem(id, { price: Number(input.value), active: !item.active });
          toast(`${updated.name} · ${updated.active ? '판매 시작' : '판매 중지'}`);
        } catch (error) {
          toast(error.message);
        } finally {
          button.disabled = false;
        }
      });
    });

    document.querySelectorAll('[data-stock]').forEach(button => {
      button.addEventListener('click', async () => {
        button.disabled = true;
        try {
          const item = await store.toggleSoldOut(button.dataset.stock);
          if (item) toast(`${item.name} · ${item.soldOut ? '품절' : '판매 재개'}`);
        } catch (error) {
          toast(error.message);
        } finally {
          button.disabled = false;
        }
      });
    });
  }

  function renderMenu(state) {
    if (!state.menu.length) {
      $('#admin-menu-list').innerHTML = '<div class="empty-state">등록된 메뉴가 없습니다.</div>';
      return;
    }
    $('#admin-menu-list').innerHTML = state.menu.map(item => `<div class="admin-menu-item menu-editor ${item.active ? '' : 'inactive'}">
      <div class="menu-editor-title"><strong>${escapeHtml(item.name)}</strong><small>${item.active ? (item.soldOut ? '품절' : '판매 중') : '판매 준비 중'}</small></div>
      <div class="menu-editor-controls">
        <label><span class="sr-only">${escapeHtml(item.name)} 가격</span><input class="price-input" data-price="${item.id}" type="number" min="0" step="100" inputmode="numeric" value="${item.price}" aria-label="${escapeHtml(item.name)} 가격"></label>
        <button class="stock-button" type="button" data-save-price="${item.id}">가격 저장</button>
        <button class="stock-button ${item.active ? '' : 'start'}" type="button" data-active="${item.id}">${item.active ? '판매 중지' : '판매 시작'}</button>
        <button class="stock-button ${item.soldOut ? 'sold-out' : ''}" type="button" data-stock="${item.id}" ${item.active ? '' : 'disabled'}>${item.soldOut ? '품절 해제' : '품절 처리'}</button>
      </div>
    </div>`).join('');
    bindMenuActions();
  }

  function render(state) {
    renderMetrics(state);
    renderOrders(state);
    renderMenu(state);
  }

  function clearAdminView() {
    $('#metric-sales').textContent = '0원';
    $('#metric-payment').textContent = '0';
    $('#metric-cooking').textContent = '0';
    $('#metric-ready').textContent = '0';
    $('#metric-done').textContent = '0';
    $('#admin-orders').replaceChildren();
    $('#admin-menu-list').replaceChildren();
  }

  function renderAuth() {
    const auth = store.getAuthState();
    const login = $('#admin-login');
    const app = $('#admin-app');
    const status = $('#login-status');
    const sendButton = $('#send-login-link');
    const logoutFromLogin = $('#login-sign-out');

    if (!auth.initialized) {
      clearAdminView();
      login.hidden = false;
      app.hidden = true;
      status.textContent = '로그인 상태를 확인하고 있습니다.';
      sendButton.hidden = true;
      logoutFromLogin.hidden = true;
      return;
    }
    if (!auth.session) {
      clearAdminView();
      login.hidden = false;
      app.hidden = true;
      status.textContent = '비밀번호로 로그인하거나 이메일 링크를 받을 수 있습니다.';
      sendButton.hidden = false;
      logoutFromLogin.hidden = true;
      return;
    }
    if (!auth.isAdmin) {
      clearAdminView();
      login.hidden = false;
      app.hidden = true;
      status.textContent = '이 계정에는 부스 관리자 권한이 없습니다.';
      sendButton.hidden = true;
      logoutFromLogin.hidden = false;
      return;
    }
    login.hidden = true;
    app.hidden = false;
    render(store.getState());
  }

  $('#order-filters').addEventListener('click', event => {
    const button = event.target.closest('[data-filter]');
    if (!button) return;
    activeFilter = button.dataset.filter;
    document.querySelectorAll('[data-filter]').forEach(item => item.classList.toggle('active', item === button));
    renderOrders(store.getState());
  });

  function friendlyAuthError(error) {
    const message = String(error && error.message || error).toLowerCase();
    if (message.includes('rate limit')) return '로그인 이메일 발송 한도를 초과했습니다. 잠시 후 다시 시도하거나 비밀번호로 로그인해 주세요.';
    if (message.includes('invalid login credentials')) return '이메일 또는 비밀번호가 맞지 않습니다.';
    if (message.includes('email not confirmed')) return '이메일 인증이 완료되지 않은 계정입니다.';
    return error.message || '로그인에 실패했습니다.';
  }

  async function passwordLogin() {
    const button = $('#admin-password-login');
    const password = $('#admin-password').value;
    button.disabled = true;
    $('#login-status').textContent = '로그인하고 있습니다.';
    try {
      await store.signInWithPassword(ADMIN_EMAIL, password);
      renderAuth();
    } catch (error) {
      const message = friendlyAuthError(error);
      $('#login-status').textContent = message;
      toast(message);
    } finally {
      button.disabled = false;
    }
  }

  $('#admin-password-login').addEventListener('click', passwordLogin);
  $('#admin-password').addEventListener('keydown', event => {
    if (event.key === 'Enter') passwordLogin();
  });

  $('#send-login-link').addEventListener('click', async event => {
    const button = event.currentTarget;
    button.disabled = true;
    $('#login-status').textContent = '로그인 이메일을 보내고 있습니다.';
    try {
      await store.signInWithOtp(ADMIN_EMAIL);
      $('#login-status').textContent = `${ADMIN_EMAIL}로 보낸 링크를 열어주세요.`;
      toast('로그인 이메일을 보냈습니다.');
    } catch (error) {
      const message = friendlyAuthError(error);
      $('#login-status').textContent = message;
      toast(message);
    } finally {
      button.disabled = false;
    }
  });

  async function logout(button) {
    button.disabled = true;
    try {
      await store.signOut();
      toast('로그아웃했습니다.');
      renderAuth();
    } catch (error) {
      toast(error.message);
    } finally {
      button.disabled = false;
    }
  }
  $('#admin-logout').addEventListener('click', event => logout(event.currentTarget));
  $('#login-sign-out').addEventListener('click', event => logout(event.currentTarget));

  store.subscribe(state => {
    renderAuth();
    if (store.getAuthState().isAdmin) render(state);
  });

  store.ready().then(renderAuth).catch(error => {
    $('#login-status').textContent = `연결 실패: ${error.message}`;
    toast(error.message);
  });
})();
